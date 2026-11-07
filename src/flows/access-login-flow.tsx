/**
 * ACCESS Login Help Ticket Flow
 *
 * This flow handles ticket creation for users having trouble logging into ACCESS.
 * It demonstrates how to wrap qa-bot-core's FileUploadComponent with ACCESS-specific
 * ticket submission logic.
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
 * Creates the ACCESS login help ticket flow
 *
 * Note: chatDisabled is handled automatically by applyFlowSettings() in AccessQABot.
 */
export function createAccessLoginFlow({ ticketForm: _ticketForm, setTicketForm, userInfo, trackEvent }: FlowParams) {
  // Submission handler - stores result for success message
  let submissionResult: TicketSubmissionResult | null = null;

  const handleSubmit = async (formData: Record<string, unknown>, uploadedFiles: File[] = []) => {
    submissionResult = await submitTicket(formData, 'loginAccess', uploadedFiles);
    if (submissionResult.success) {
      setTicketForm(prev => ({
        ...prev,
        ticketKey: submissionResult!.ticketKey,
        ticketUrl: submissionResult!.ticketUrl,
      }));
      // Track successful submission
      trackEvent({
        type: 'chatbot_ticket_submitted',
        ticketType: 'access_login',
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
        ticketType: 'access_login',
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
    access_help: {
      message: "If you're having trouble logging into the ACCESS website, here are some common issues:\n\n" +
               "• Make sure you're using a supported browser (Chrome, Firefox, Safari)\n" +
               "• Clear your browser cookies and cache\n" +
               "• Check if you're using the correct identity provider\n\n" +
               "Would you like to submit a help ticket for ACCESS login issues?",
      options: ["Yes, let's create a ticket", "Back to Main Menu"],
      path: (chatState: ChatState) =>
        chatState.userInput === "Yes, let's create a ticket"
          ? "access_login_description"
          : "start",
    },

    // Step 1: Describe the issue (text input)
    access_login_description: {
      message: "Describe your login issue.",
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
          ticketType: 'access_login',
          step: 'description',
        });
      },
      path: "access_login_identity",
    },

    // Step 2: Identity provider (options)
    access_login_identity: {
      message: "Which identity provider were you using?",
      options: ["ACCESS", "Github", "Google", "Institution", "Microsoft", "ORCID", "Other"],
      function: (chatState: ChatState) => {
        const currentForm = getCurrentTicketForm();
        setTicketForm({ ...currentForm, identityProvider: chatState.userInput });
        trackEvent({
          type: 'chatbot_ticket_step',
          ticketType: 'access_login',
          step: 'identity_provider',
        });
      },
      path: "access_login_browser",
    },

    // Step 3: Browser (options)
    access_login_browser: {
      message: "Which browser were you using?",
      options: ["Chrome", "Firefox", "Edge", "Safari", "Other"],
      function: (chatState: ChatState) => {
        const currentForm = getCurrentTicketForm();
        setTicketForm({ ...currentForm, browser: chatState.userInput });
        trackEvent({
          type: 'chatbot_ticket_step',
          ticketType: 'access_login',
          step: 'browser',
        });
      },
      path: "access_login_attachment",
    },

    // Step 4: Ask about attachment (options)
    access_login_attachment: {
      message: "Would you like to attach a screenshot?",
      options: ["Yes", "No"],
      function: (chatState: ChatState) => {
        const currentForm = getCurrentTicketForm();
        setTicketForm({ ...currentForm, wantsAttachment: chatState.userInput });
        trackEvent({
          type: 'chatbot_ticket_step',
          ticketType: 'access_login',
          step: 'attachment_choice',
        });
      },
      path: (chatState: ChatState) => {
        if (chatState.userInput === "Yes") {
          return "access_login_upload";
        }
        // Skip to user info collection based on what's missing
        const formWithUserInfo = getCurrentFormWithUserInfo(userInfo);
        if (!formWithUserInfo.email) return "access_login_email";
        if (!formWithUserInfo.name) return "access_login_name";
        if (!formWithUserInfo.accessId) return "access_login_accessid";
        return "access_login_summary";
      },
    },

    // Step 5: File upload (component + Continue button)
    access_login_upload: {
      message: "Please upload your screenshot.",
      component: fileUploadElement,
      options: ["Continue"],
      function: () => {
        const currentForm = getCurrentTicketForm();
        setTicketForm({ ...currentForm, uploadConfirmed: true });
        trackEvent({
          type: 'chatbot_ticket_step',
          ticketType: 'access_login',
          step: 'file_upload',
        });
      },
      path: () => {
        const formWithUserInfo = getCurrentFormWithUserInfo(userInfo);
        if (!formWithUserInfo.email) return "access_login_email";
        if (!formWithUserInfo.name) return "access_login_name";
        if (!formWithUserInfo.accessId) return "access_login_accessid";
        return "access_login_summary";
      },
    },

    // Step 6: Email (text input)
    access_login_email: {
      message: "What is your email?",
      validateTextInput: validateEmail,
      function: (chatState: ChatState) => {
        const currentForm = getCurrentTicketForm();
        setTicketForm({ ...currentForm, email: chatState.userInput });
        trackEvent({
          type: 'chatbot_ticket_step',
          ticketType: 'access_login',
          step: 'email',
        });
      },
      path: () => {
        const formWithUserInfo = getCurrentFormWithUserInfo(userInfo);
        if (!formWithUserInfo.name) return "access_login_name";
        if (!formWithUserInfo.accessId) return "access_login_accessid";
        return "access_login_summary";
      },
    },

    // Step 7: Name (text input)
    access_login_name: {
      message: "What is your name?",
      function: (chatState: ChatState) => {
        const currentForm = getCurrentTicketForm();
        setTicketForm({ ...currentForm, name: chatState.userInput });
        trackEvent({
          type: 'chatbot_ticket_step',
          ticketType: 'access_login',
          step: 'name',
        });
      },
      path: () => {
        const formWithUserInfo = getCurrentFormWithUserInfo(userInfo);
        if (!formWithUserInfo.accessId) return "access_login_accessid";
        return "access_login_summary";
      },
    },

    // Step 8: ACCESS ID (text input, optional)
    access_login_accessid: {
      message: "What is your ACCESS ID? (Optional - press Enter to skip)",
      validateTextInput: createOptionalFieldValidator(),
      function: (chatState: ChatState) => {
        const currentForm = getCurrentTicketForm();
        setTicketForm({ ...currentForm, accessId: processOptionalInput(chatState.userInput) });
        trackEvent({
          type: 'chatbot_ticket_step',
          ticketType: 'access_login',
          step: 'access_id',
        });
      },
      path: "access_login_summary",
    },

    // Step 9: Summary and confirmation (options)
    access_login_summary: {
      message: (chatState: ChatState) => {
        const currentForm = getCurrentTicketForm();
        const formWithUserInfo = getCurrentFormWithUserInfo(userInfo);
        const fileInfo = getFileInfo(currentForm.uploadedFiles);

        // Handle ACCESS ID timing issue
        let finalAccessId = formWithUserInfo.accessId;
        if (chatState.prevPath === 'access_login_accessid' && chatState.userInput) {
          finalAccessId = chatState.userInput;
        }

        return `Thank you for providing your ACCESS login issue details. Here's a summary:\n\n` +
               `Name: ${formWithUserInfo.name || 'Not provided'}\n` +
               `Email: ${formWithUserInfo.email || 'Not provided'}\n` +
               `ACCESS ID: ${finalAccessId || 'Not provided'}\n` +
               `Identity Provider: ${currentForm.identityProvider || 'Not provided'}\n` +
               `Browser: ${currentForm.browser || 'Not provided'}\n` +
               `Issue Description: ${currentForm.description || 'Not provided'}${fileInfo}\n\n` +
               `Would you like to submit this ticket?`;
      },
      options: ["Submit Ticket", "Back to Main Menu"],
      renderHtml: ["BOT", "USER"],
      function: async (chatState: ChatState) => {
        if (chatState.userInput === "Submit Ticket") {
          const currentForm = getCurrentTicketForm();
          const formWithUserInfo = getCurrentFormWithUserInfo(userInfo);
          const formData = {
            email: formWithUserInfo.email || "",
            name: formWithUserInfo.name || "",
            accessId: formWithUserInfo.accessId || "",
            description: currentForm.description || "",
            identityProvider: currentForm.identityProvider || "",
            browser: currentForm.browser || "",
          };

          await handleSubmit(formData, currentForm.uploadedFiles || []);
        }
      },
      path: (chatState: ChatState) =>
        chatState.userInput === "Submit Ticket" ? "access_login_success" : "start",
    },

    // Step 10: Success message (options)
    access_login_success: {
      message: withHistoryFn(() => generateSuccessMessage(submissionResult, 'ACCESS login ticket')),
      options: ["Back to Main Menu"],
      renderHtml: ["BOT"],
      path: "start",
    },
  };
}
