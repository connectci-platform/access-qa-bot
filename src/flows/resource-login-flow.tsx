/**
 * Resource/Affiliated Login Help Ticket Flow
 *
 * This flow handles ticket creation for users having trouble logging into
 * an ACCESS-affiliated resource (e.g., Expanse, Bridges-2, Anvil).
 *
 * Language matches: qa-bot/src/utils/flows/tickets/affiliated-login-flow.js
 */

import { FileUploadComponent, withHistoryFn } from '@snf/qa-bot-core';
import {
  getCurrentTicketForm,
  getCurrentFormWithUserInfo,
  getFileInfo,
  type TicketFormData,
  type UserInfo,
} from '../utils/flow-context';
import { submitTicket, generateSuccessMessage, type TicketSubmissionResult } from '../utils/ticket-api';
import { validateEmail, createOptionalFieldValidator, processOptionalInput } from '../utils/validation';
import type { TrackEventFn } from '../utils/analytics';

interface FlowParams {
  ticketForm: TicketFormData;
  setTicketForm: (form: TicketFormData | ((prev: TicketFormData) => TicketFormData)) => void;
  userInfo: UserInfo;
  trackEvent: TrackEventFn;
}

export interface ChatState {
  userInput: string;
  prevPath?: string | null;
}

/**
 * Creates the Resource/Affiliated Login help ticket flow
 */
export function createResourceLoginFlow({ ticketForm: _ticketForm, setTicketForm, userInfo, trackEvent }: FlowParams) {
  // Submission handler - stores result for success message
  let submissionResult: TicketSubmissionResult | null = null;

  const handleSubmit = async (formData: Record<string, unknown>, uploadedFiles: File[] = []) => {
    submissionResult = await submitTicket(formData, 'loginProvider', uploadedFiles);
    if (submissionResult.success) {
      setTicketForm(prev => ({
        ...prev,
        ticketKey: submissionResult!.ticketKey,
        ticketUrl: submissionResult!.ticketUrl,
      }));
      // Track successful submission
      trackEvent({
        type: 'chatbot_ticket_submitted',
        ticketType: 'resource_login',
        success: true,
        ticketKey: submissionResult.ticketKey,
      });
    } else {
      setTicketForm(prev => ({
        ...prev,
        submissionError: submissionResult!.error,
      }));
      // Track submission error
      trackEvent({
        type: 'chatbot_ticket_error',
        ticketType: 'resource_login',
        errorType: submissionResult.error || 'unknown',
      });
    }
  };

  // File upload component - wired to update form state
  const fileUploadElement = (
    <FileUploadComponent
      onFileUpload={(files) => {
        setTicketForm(prev => ({
          ...prev,
          uploadedFiles: files,
        }));
        // Track file uploads
        files.forEach(file => {
          trackEvent({
            type: 'chatbot_file_uploaded',
            fileType: file.type || 'unknown',
            fileSize: file.size,
          });
        });
      }}
      enableScreenshot={true}
      maxSizeMB={10}
    />
  );

  return {
    // Entry point - provides context and asks if user wants to create ticket
    resource_help: {
      message: "If you're having trouble logging into an affiliated infrastructure or resource provider, here are some common issues:\n\n" +
               "• Ensure your allocation is active\n" +
               "• Confirm you have the correct username for that resource\n" +
               "• Check <a href=\"https://operations.access-ci.org/infrastructure_news_view\">System Status News</a> to see if the resource is undergoing maintenance\n\n" +
               "Would you like to submit a help ticket for resource provider login issues?",
      options: ["Yes, let's create a ticket", "Back to Main Menu"],
      renderHtml: ["BOT"],
      path: (chatState: ChatState) =>
        chatState.userInput === "Yes, let's create a ticket"
          ? "resource_login_resource"
          : "start",
    },

    // Step 1: Which resource (options)
    resource_login_resource: {
      message: "Which ACCESS Resource are you trying to access?",
      options: [
        "ACES",
        "Anvil",
        "Bridges-2",
        "DARWIN",
        "Delta",
        "DeltaAI",
        "Derecho",
        "Expanse",
        "FASTER",
        "Granite",
        "Jetstream2",
        "KyRIC",
        "Launch",
        "Neocortex",
        "Ookami",
        "Open Science Grid",
        "Open Storage Network",
        "Ranch",
        "Stampede3",
      ],
      function: (chatState: ChatState) => {
        const currentForm = getCurrentTicketForm();
        setTicketForm({ ...currentForm, resource: chatState.userInput });
        trackEvent({
          type: 'chatbot_ticket_step',
          ticketType: 'resource_login',
          step: 'resource_selection',
        });
      },
      path: "resource_login_userid",
    },

    // Step 2: User ID at resource (text input)
    resource_login_userid: {
      message: "What is your user ID at the resource?",
      function: (chatState: ChatState) => {
        const currentForm = getCurrentTicketForm();
        setTicketForm({ ...currentForm, userIdResource: chatState.userInput });
        trackEvent({
          type: 'chatbot_ticket_step',
          ticketType: 'resource_login',
          step: 'user_id',
        });
      },
      path: "resource_login_description",
    },

    // Step 3: Describe the issue (text input)
    resource_login_description: {
      message: "Please describe the issue you're having logging in.",
      function: (chatState: ChatState) => {
        const currentForm = getCurrentTicketForm();
        setTicketForm({
          ...currentForm,
          description: chatState.userInput,
          email: userInfo.email || currentForm.email,
          name: userInfo.name || currentForm.name,
          accessId: userInfo.accessId || currentForm.accessId,
        });
        trackEvent({
          type: 'chatbot_ticket_step',
          ticketType: 'resource_login',
          step: 'description',
        });
      },
      path: "resource_login_attachment",
    },

    // Step 4: Ask about attachment (options)
    resource_login_attachment: {
      message: "Would you like to attach a screenshot?",
      options: ["Yes", "No"],
      function: (chatState: ChatState) => {
        const currentForm = getCurrentTicketForm();
        setTicketForm({ ...currentForm, wantsAttachment: chatState.userInput });
        trackEvent({
          type: 'chatbot_ticket_step',
          ticketType: 'resource_login',
          step: 'attachment_choice',
        });
      },
      path: (chatState: ChatState) => {
        if (chatState.userInput === "Yes") {
          return "resource_login_upload";
        }
        // Skip to user info collection based on what's missing
        const formWithUserInfo = getCurrentFormWithUserInfo(userInfo);
        if (!formWithUserInfo.email) return "resource_login_email";
        if (!formWithUserInfo.name) return "resource_login_name";
        if (!formWithUserInfo.accessId) return "resource_login_accessid";
        return "resource_login_summary";
      },
    },

    // Step 5: File upload (component + Continue button)
    resource_login_upload: {
      message: "Please upload your screenshot.",
      component: fileUploadElement,
      options: ["Continue"],
      function: () => {
        const currentForm = getCurrentTicketForm();
        setTicketForm({ ...currentForm, uploadConfirmed: true });
        trackEvent({
          type: 'chatbot_ticket_step',
          ticketType: 'resource_login',
          step: 'file_upload',
        });
      },
      path: () => {
        const formWithUserInfo = getCurrentFormWithUserInfo(userInfo);
        if (!formWithUserInfo.email) return "resource_login_email";
        if (!formWithUserInfo.name) return "resource_login_name";
        if (!formWithUserInfo.accessId) return "resource_login_accessid";
        return "resource_login_summary";
      },
    },

    // Step 6: Email (text input)
    resource_login_email: {
      message: "What is your email?",
      validateTextInput: validateEmail,
      function: (chatState: ChatState) => {
        const currentForm = getCurrentTicketForm();
        setTicketForm({ ...currentForm, email: chatState.userInput });
        trackEvent({
          type: 'chatbot_ticket_step',
          ticketType: 'resource_login',
          step: 'email',
        });
      },
      path: () => {
        const formWithUserInfo = getCurrentFormWithUserInfo(userInfo);
        if (!formWithUserInfo.name) return "resource_login_name";
        if (!formWithUserInfo.accessId) return "resource_login_accessid";
        return "resource_login_summary";
      },
    },

    // Step 7: Name (text input)
    resource_login_name: {
      message: "What is your name?",
      function: (chatState: ChatState) => {
        const currentForm = getCurrentTicketForm();
        setTicketForm({ ...currentForm, name: chatState.userInput });
        trackEvent({
          type: 'chatbot_ticket_step',
          ticketType: 'resource_login',
          step: 'name',
        });
      },
      path: () => {
        const formWithUserInfo = getCurrentFormWithUserInfo(userInfo);
        if (!formWithUserInfo.accessId) return "resource_login_accessid";
        return "resource_login_summary";
      },
    },

    // Step 8: ACCESS ID (text input, optional)
    resource_login_accessid: {
      message: "What is your ACCESS ID? (Optional - press Enter to skip)",
      validateTextInput: createOptionalFieldValidator(),
      function: (chatState: ChatState) => {
        const currentForm = getCurrentTicketForm();
        setTicketForm({ ...currentForm, accessId: processOptionalInput(chatState.userInput) });
        trackEvent({
          type: 'chatbot_ticket_step',
          ticketType: 'resource_login',
          step: 'access_id',
        });
      },
      path: "resource_login_summary",
    },

    // Step 9: Summary and confirmation (options)
    resource_login_summary: {
      message: (chatState: ChatState) => {
        const currentForm = getCurrentTicketForm();
        const formWithUserInfo = getCurrentFormWithUserInfo(userInfo);
        const fileInfo = getFileInfo(currentForm.uploadedFiles);

        // Handle ACCESS ID timing issue
        let finalAccessId = formWithUserInfo.accessId;
        if (chatState.prevPath === 'resource_login_accessid' && chatState.userInput) {
          finalAccessId = chatState.userInput;
        }

        return `Thank you for providing your resource login issue details. Here's a summary:\n\n` +
               `Name: ${formWithUserInfo.name || 'Not provided'}\n` +
               `Email: ${formWithUserInfo.email || 'Not provided'}\n` +
               `ACCESS ID: ${finalAccessId || 'Not provided'}\n` +
               `Resource: ${currentForm.resource || 'Not provided'}\n` +
               `Resource User ID: ${currentForm.userIdResource || 'Not provided'}\n` +
               `Issue Description: ${currentForm.description || 'Not provided'}${fileInfo}\n\n` +
               `Would you like to submit this ticket?`;
      },
      options: ["Submit Ticket", "Back to Main Menu"],
      function: async (chatState: ChatState) => {
        if (chatState.userInput === "Submit Ticket") {
          const currentForm = getCurrentTicketForm();
          const formWithUserInfo = getCurrentFormWithUserInfo(userInfo);
          const formData = {
            email: formWithUserInfo.email || "",
            name: formWithUserInfo.name || "",
            accessId: formWithUserInfo.accessId || "",
            accessResource: currentForm.resource || "",
            description: currentForm.description || "",
            // ProForma field for request type 31
            userIdAtResource: currentForm.userIdResource || "",
          };

          await handleSubmit(formData, currentForm.uploadedFiles || []);
        }
      },
      path: (chatState: ChatState) =>
        chatState.userInput === "Submit Ticket" ? "resource_login_success" : "start",
    },

    // Step 10: Success message (options)
    resource_login_success: {
      message: withHistoryFn(() => generateSuccessMessage(submissionResult, 'resource login ticket')),
      options: ["Back to Main Menu"],
      renderHtml: ["BOT"],
      path: "start",
    },
  };
}
