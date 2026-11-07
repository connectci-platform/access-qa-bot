/**
 * General Help Ticket Flow
 *
 * This flow handles ticket creation for general support questions.
 * Includes category selection, keywords, priority, and resource involvement.
 *
 * Language matches: qa-bot/src/utils/flows/tickets/general-help-flow.js
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

// Keywords list from old qa-bot
const KEYWORDS = [
  " C, C++",
  "Abaqus",
  "ACCESS",
  "ACCESS-credits",
  "ACCESS-website",
  "Accounts",
  "ACLS",
  "Adding users",
  "Affiliations",
  "Affinity Groups",
  "AI",
  "Algorithms",
  "Allocation extension",
  "Allocation Management",
  "Allocation proposal",
  "Allocation Time",
  "Allocation users",
  "AMBER",
  "AMIE",
  "Anaconda",
  "Analysis",
  "API",
  "Application Status",
  "ARCGIS",
  "Architecture",
  "Archiving",
  "Astrophysics",
  "ATLAS",
  "Authentication",
  "AWS",
  "AZURE",
  "Backup",
  "BASH",
  "Batch Jobs",
  "Benchmarking",
  "Big Data",
  "Bioinformatics",
  "Biology",
  "Ceph",
  "CFD",
  "cgroups",
  "CHARMM",
  "Checkpoint",
  "cilogon",
  "citation",
  "Cloud",
  "Cloud Computing",
  "Cloud Lab",
  "Cloud Storage",
  "Cluster Management",
  "Cluster Support",
  "CMMC",
  "Community Outreach",
  "Compiling",
  "Composible Systems",
  "Computataional Chemistry",
  "COMSOL",
  "Conda",
  "Condo",
  "Containers",
  "Core dump",
  "Core hours",
  "CP2K",
  "CPU architecture",
  "CPU bound",
  "CUDA",
  "Cybersecurity",
  "CYVERSE",
  "Data",
  "Data Storage",
  "Data-access-protocols",
  "Data-analysis",
  "Data-compliance",
  "Data-lifecycle",
  "Data-management",
  "Data-management-software",
  "Data-provenance",
  "Data-reproducibility",
  "Data-retention",
  "Data-science",
  "Data-sharing",
  "Data-transfer",
  "Data-wrangling",
  "Database-update",
  "Debugging",
  "Debugging, Optimizatio and Profiling",
  "Deep-learning",
  "Dependencies",
  "Deployment",
  "DFT",
  "Distributed-computing",
  "DNS",
  "Docker",
  "Documentation",
  "DOI",
  "DTN",
  "Easybuild",
  "Email",
  "Encryption",
  "Environment-modules",
  "Errors",
  "Extension",
  "FastX",
  "Federated-authentication",
  "File transfers",
  "File-formats",
  "File-limits",
  "File-systems",
  "File-transfer",
  "Finite-element-analysis",
  "Firewall",
  "Fortran",
  "Frameworks and IDE's",
  "GAMESS",
  "Gateways",
  "GATK",
  "Gaussian",
  "GCC",
  "Genomics",
  "GIS",
  "Git",
  "Globus",
  "GPFS",
  "GPU",
  "Gravitational-waves",
  "Gridengine",
  "GROMACS",
  "Hadoop",
  "Hardware",
  "Image-processing",
  "Infiniband",
  "Interactive-mode",
  "Interconnect",
  "IO-Issue",
  "ISILON",
  "Java",
  "Jekyll",
  "Jetstream",
  "Job-accounting",
  "Job-array",
  "Job-charging",
  "Job-failure",
  "Job-sizing",
  "Job-submission",
  "Julia",
  "Jupyterhub",
  "Key-management",
  "Kubernetes",
  "KyRIC",
  "LAMMPS",
  "Library-paths",
  "License",
  "Linear-programming",
  "Linux",
  "LMOD",
  "login",
  "LSF",
  "Lustre",
  "Machine-learning",
  "Management",
  "Materials-science",
  "Mathematica",
  "MATLAB",
  "Memory",
  "Metadata",
  "Modules",
  "Molecular-dynamics",
  "Monte-carlo",
  "MPI",
  "NAMD",
  "NetCDF",
  "Networking",
  "Neural-networks",
  "NFS",
  "NLP",
  "NoMachine",
  "Nvidia",
  "Oceanography",
  "OnDemnad",
  "Open-science-grid",
  "Open-storage-network",
  "OpenCV",
  "Openfoam",
  "OpenMP",
  "OpenMPI",
  "OpenSHIFT",
  "Openstack",
  "Optimization",
  "OS",
  "OSG",
  "Parallelization",
  "Parameter-sweeps",
  "Paraview",
  "Particle-physics",
  "password",
  "PBS",
  "Pegasus",
  "Pending-jobs",
  "Performance-tuning",
  "Permissions",
  "Physiology",
  "PIP",
  "PODMAN",
  "Portals",
  "Pre-emption",
  "Professional and Workforce Development",
  "Professional-development",
  "Profile",
  "Profiling",
  "Programming",
  "Programming Languages",
  "Programming-best-practices",
  "Project-management",
  "Project-renewal",
  "Provisioning",
  "Pthreads",
  "Publication-database",
  "Putty",
  "Python",
  "Pytorch",
  "Quantum-computing",
  "Quantum-mechanics",
  "Quota",
  "R",
  "RDP",
  "React",
  "Reporting",
  "Research-facilitation",
  "Research-grants",
  "Resources",
  "Rstudio-server",
  "S3",
  "Samba",
  "SAS",
  "Scaling",
  "Schedulers",
  "Scheduling",
  "Science DMZ",
  "Science Gateways",
  "Scikit-learn",
  "Scratch",
  "screen",
  "scripting",
  "SDN",
  "Secure Computing and Data",
  "Secure-data-architecture",
  "Serverless-hpc",
  "setup",
  "sftp",
  "SGE",
  "Shell Scripting",
  "Shifter",
  "Singularity",
  "SLURM",
  "SMB",
  "Smrtanalysis",
  "Software Installations",
  "Software-carpentry",
  "SPACK",
  "SPARK",
  "Spectrum-scale",
  "SPSS",
  "SQL",
  "SSH",
  "Stampede2",
  "STATA",
  "Storage",
  "Supplement",
  "Support",
  "TCP",
  "Technical-training-for-hpc",
  "Tensorflow",
  "Terminal-emulation-and-window-management",
  "Tickets",
  "Timing-issue",
  "TMUX",
  "Tools",
  "Training",
  "Transfer SUs",
  "Trinity",
  "Tuning",
  "Unix-environment",
  "Upgrading",
  "Vectorization",
  "Version-control",
  "vim",
  "VNC",
  "VPN",
  "Workflow",
  "Workforce-development",
  "X11",
  "Xalt",
  "XDMoD",
  "XML",
  "XSEDE",
  "I don't see a relevant keyword",
];

// Resource list (same as affiliated login)
const RESOURCES = [
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
];

/**
 * Creates the General Help ticket flow
 */
export function createGeneralHelpFlow({ ticketForm: _ticketForm, setTicketForm, userInfo, trackEvent }: FlowParams) {
  // Submission handler - stores result for success message
  let submissionResult: TicketSubmissionResult | null = null;

  const handleSubmit = async (formData: Record<string, unknown>, uploadedFiles: File[] = []) => {
    submissionResult = await submitTicket(formData, 'support', uploadedFiles);
    if (submissionResult.success) {
      setTicketForm(prev => ({
        ...prev,
        ticketKey: submissionResult!.ticketKey,
        ticketUrl: submissionResult!.ticketUrl,
      }));
      // Track successful submission
      trackEvent({
        type: 'chatbot_ticket_submitted',
        ticketType: 'general_help',
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
        ticketType: 'general_help',
        errorType: submissionResult.error || 'unknown',
      });
    }
  };

  // File upload component
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
    // Step 1: Title/Summary (text input)
    general_help_summary_subject: {
      message: "Provide a short title for your ticket.",
      function: (chatState: ChatState) => {
        const currentForm = getCurrentTicketForm();
        setTicketForm({
          ...currentForm,
          summary: chatState.userInput,
          email: userInfo.email || currentForm.email,
          name: userInfo.name || currentForm.name,
          accessId: userInfo.accessId || currentForm.accessId,
        });
        trackEvent({
          type: 'chatbot_ticket_step',
          ticketType: 'general_help',
          step: 'title',
        });
      },
      path: "general_help_category",
    },

    // Step 2: Category (options)
    general_help_category: {
      message: "What type of issue are you experiencing?",
      options: [
        "User Account Question",
        "Allocation Question",
        "User Support Question",
        "CSSN/CCEP Question",
        "Training Question",
        "Metrics Question",
        "OnDemand Question",
        "Pegasus Question",
        "XDMoD Question",
        "Some Other Question",
      ],
      function: (chatState: ChatState) => {
        const currentForm = getCurrentTicketForm();
        setTicketForm({ ...currentForm, category: chatState.userInput });
        trackEvent({
          type: 'chatbot_ticket_step',
          ticketType: 'general_help',
          step: 'category',
        });
      },
      path: "general_help_description",
    },

    // Step 3: Description (text input)
    general_help_description: {
      message: "Please describe your issue.",
      function: (chatState: ChatState) => {
        const currentForm = getCurrentTicketForm();
        setTicketForm({ ...currentForm, description: chatState.userInput });
        trackEvent({
          type: 'chatbot_ticket_step',
          ticketType: 'general_help',
          step: 'description',
        });
      },
      path: "general_help_attachment",
    },

    // Step 4: Attachment? (options)
    general_help_attachment: {
      message: "Would you like to attach a file to your ticket?",
      options: ["Yes", "No"],
      function: (chatState: ChatState) => {
        const currentForm = getCurrentTicketForm();
        setTicketForm({ ...currentForm, wantsAttachment: chatState.userInput });
        trackEvent({
          type: 'chatbot_ticket_step',
          ticketType: 'general_help',
          step: 'attachment_choice',
        });
      },
      path: (chatState: ChatState) =>
        chatState.userInput === "Yes" ? "general_help_upload" : "general_help_resource",
    },

    // Step 5: File upload (conditional)
    general_help_upload: {
      message: "Please upload your file.",
      component: fileUploadElement,
      options: ["Continue"],
      function: () => {
        const currentForm = getCurrentTicketForm();
        setTicketForm({ ...currentForm, uploadConfirmed: true });
        trackEvent({
          type: 'chatbot_ticket_step',
          ticketType: 'general_help',
          step: 'file_upload',
        });
      },
      path: "general_help_resource",
    },

    // Step 6: Involves resource? (options)
    general_help_resource: {
      message: "Does your problem involve an ACCESS Resource?",
      options: ["Yes", "No"],
      function: (chatState: ChatState) => {
        const currentForm = getCurrentTicketForm();
        setTicketForm({ ...currentForm, involvesResource: chatState.userInput.toLowerCase() });
        trackEvent({
          type: 'chatbot_ticket_step',
          ticketType: 'general_help',
          step: 'resource_choice',
        });
      },
      path: (chatState: ChatState) =>
        chatState.userInput === "Yes" ? "general_help_resource_details" : "general_help_keywords",
    },

    // Step 7: Resource selection (conditional)
    general_help_resource_details: {
      message: "Please select the ACCESS Resource involved with your issue:",
      options: RESOURCES,
      function: (chatState: ChatState) => {
        const currentForm = getCurrentTicketForm();
        setTicketForm({ ...currentForm, resourceDetails: chatState.userInput });
        trackEvent({
          type: 'chatbot_ticket_step',
          ticketType: 'general_help',
          step: 'resource_selection',
        });
      },
      path: "general_help_user_id_at_resource",
    },

    // Step 8: User ID at resource (conditional, optional)
    general_help_user_id_at_resource: {
      message: "What is your User ID at the selected resource(s)? (Optional - press Enter to skip)",
      validateTextInput: createOptionalFieldValidator(),
      function: (chatState: ChatState) => {
        const currentForm = getCurrentTicketForm();
        setTicketForm({ ...currentForm, userIdAtResource: processOptionalInput(chatState.userInput) });
        trackEvent({
          type: 'chatbot_ticket_step',
          ticketType: 'general_help',
          step: 'resource_user_id',
        });
      },
      path: "general_help_keywords",
    },

    // Step 9: Keywords (checkboxes)
    general_help_keywords: {
      message: "Please add up to 5 keywords to help route your ticket.",
      checkboxes: {
        items: KEYWORDS,
        min: 0,
        max: 5,
      },
      function: (chatState: ChatState) => {
        const currentForm = getCurrentTicketForm();
        setTicketForm({ ...currentForm, keywords: chatState.userInput });
        trackEvent({
          type: 'chatbot_ticket_step',
          ticketType: 'general_help',
          step: 'keywords',
        });
      },
      path: (chatState: ChatState) => {
        if (chatState.userInput && chatState.userInput.includes("I don't see a relevant keyword")) {
          return "general_help_additional_keywords";
        }
        return "general_help_priority";
      },
    },

    // Step 10: Additional keywords (conditional, text input)
    general_help_additional_keywords: {
      message: "Please enter additional keywords, separated by commas:",
      function: (chatState: ChatState) => {
        const currentForm = getCurrentTicketForm();
        const currentKeywords = currentForm.keywords || [];
        const additionalKeywords = chatState.userInput;

        // Ensure we're working with arrays
        const keywordsArray = Array.isArray(currentKeywords)
          ? [...currentKeywords]
          : String(currentKeywords).split(',').map(k => k.trim());

        // Filter out "I don't see a relevant keyword"
        const filteredKeywords = keywordsArray.filter(k => k !== "I don't see a relevant keyword");

        // Combine keywords
        const formattedKeywords = filteredKeywords.length > 0
          ? [...filteredKeywords, additionalKeywords].join(", ")
          : additionalKeywords;

        setTicketForm({
          ...currentForm,
          keywords: formattedKeywords,
          suggestedKeyword: additionalKeywords,
        });
        trackEvent({
          type: 'chatbot_ticket_step',
          ticketType: 'general_help',
          step: 'additional_keywords',
        });
      },
      path: "general_help_priority",
    },

    // Step 11: Priority (options)
    general_help_priority: {
      message: "Please select a priority for your issue:",
      options: ["Lowest", "Low", "Medium", "High", "Highest"],
      function: (chatState: ChatState) => {
        const currentForm = getCurrentTicketForm();
        setTicketForm({ ...currentForm, priority: chatState.userInput.toLowerCase() });
        trackEvent({
          type: 'chatbot_ticket_step',
          ticketType: 'general_help',
          step: 'priority',
        });
      },
      path: () => {
        const formWithUserInfo = getCurrentFormWithUserInfo(userInfo);
        if (!formWithUserInfo.email) return "general_help_email";
        if (!formWithUserInfo.name) return "general_help_name";
        if (!formWithUserInfo.accessId) return "general_help_accessid";
        return "general_help_ticket_summary";
      },
    },

    // Step 12: Email (text input, conditional)
    general_help_email: {
      message: "What is your email address?",
      validateTextInput: validateEmail,
      function: (chatState: ChatState) => {
        const currentForm = getCurrentTicketForm();
        setTicketForm({ ...currentForm, email: chatState.userInput });
        trackEvent({
          type: 'chatbot_ticket_step',
          ticketType: 'general_help',
          step: 'email',
        });
      },
      path: () => {
        const formWithUserInfo = getCurrentFormWithUserInfo(userInfo);
        if (!formWithUserInfo.name) return "general_help_name";
        if (!formWithUserInfo.accessId) return "general_help_accessid";
        return "general_help_ticket_summary";
      },
    },

    // Step 13: Name (text input, conditional)
    general_help_name: {
      message: "What is your name?",
      function: (chatState: ChatState) => {
        const currentForm = getCurrentTicketForm();
        setTicketForm({ ...currentForm, name: chatState.userInput });
        trackEvent({
          type: 'chatbot_ticket_step',
          ticketType: 'general_help',
          step: 'name',
        });
      },
      path: () => {
        const formWithUserInfo = getCurrentFormWithUserInfo(userInfo);
        if (!formWithUserInfo.accessId) return "general_help_accessid";
        return "general_help_ticket_summary";
      },
    },

    // Step 14: ACCESS ID (text input, optional)
    general_help_accessid: {
      message: "What is your ACCESS ID? (Optional - press Enter to skip)",
      validateTextInput: createOptionalFieldValidator(),
      function: (chatState: ChatState) => {
        const currentForm = getCurrentTicketForm();
        setTicketForm({ ...currentForm, accessId: processOptionalInput(chatState.userInput) });
        trackEvent({
          type: 'chatbot_ticket_step',
          ticketType: 'general_help',
          step: 'access_id',
        });
      },
      path: "general_help_ticket_summary",
    },

    // Step 15: Summary and confirmation
    general_help_ticket_summary: {
      message: (chatState: ChatState) => {
        const currentForm = getCurrentTicketForm();
        const formWithUserInfo = getCurrentFormWithUserInfo(userInfo);
        const fileInfo = getFileInfo(currentForm.uploadedFiles);

        // Handle ACCESS ID timing issue
        let finalAccessId = formWithUserInfo.accessId;
        if (chatState.prevPath === 'general_help_accessid' && chatState.userInput) {
          finalAccessId = chatState.userInput;
        }

        let resourceInfo = '';
        if (currentForm.involvesResource === 'yes') {
          resourceInfo = `\nResource: ${currentForm.resourceDetails || 'Not specified'}`;
          if (currentForm.userIdAtResource) {
            resourceInfo += `\nUser ID at Resource: ${currentForm.userIdAtResource}`;
          }
        }

        return `Thank you for providing your issue details. Here's a summary:\n\n` +
               `Name: ${formWithUserInfo.name || 'Not provided'}\n` +
               `Email: ${formWithUserInfo.email || 'Not provided'}\n` +
               `ACCESS ID: ${finalAccessId || 'Not provided'}\n` +
               `Issue Summary: ${currentForm.summary || 'Not provided'}\n` +
               `Category: ${currentForm.category || 'Not provided'}\n` +
               `Priority: ${currentForm.priority || 'Not provided'}\n` +
               `Keywords: ${currentForm.keywords || 'Not provided'}\n` +
               `Issue Description: ${currentForm.description || 'Not provided'}${resourceInfo}${fileInfo}\n\n` +
               `Would you like to submit this ticket?`;
      },
      options: ["Submit Ticket", "Back to Main Menu"],
      function: async (chatState: ChatState) => {
        if (chatState.userInput === "Submit Ticket") {
          const currentForm = getCurrentTicketForm();
          const formWithUserInfo = getCurrentFormWithUserInfo(userInfo);
          const formData = {
            // Regular JSM fields
            email: formWithUserInfo.email || "",
            summary: currentForm.summary || "General Support Ticket",
            description: currentForm.description || "",
            priority: currentForm.priority || "medium",
            accessId: formWithUserInfo.accessId || "",
            name: formWithUserInfo.name || "",
            issueType: currentForm.category || "",
            // ProForma fields for request type 17
            hasResourceProblem: currentForm.involvesResource === 'yes' ? 'Yes' : 'No',
            userIdAtResource: currentForm.userIdAtResource || "",
            resourceName: currentForm.resourceDetails || "",
            keywords: currentForm.keywords || "",
            noRelevantKeyword: currentForm.suggestedKeyword ? 'checked' : '',
            suggestedKeyword: currentForm.suggestedKeyword || "",
          };

          await handleSubmit(formData, currentForm.uploadedFiles || []);
        }
      },
      path: (chatState: ChatState) =>
        chatState.userInput === "Submit Ticket" ? "general_help_success" : "start",
    },

    // Step 16: Success message
    general_help_success: {
      message: withHistoryFn(() => generateSuccessMessage(submissionResult, 'support ticket')),
      options: ["Back to Main Menu"],
      renderHtml: ["BOT"],
      path: "start",
    },
  };
}

