import React from "react";

export const PlayIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

export const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export const XCircleIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

export const AlertTriangleIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const FileCodeIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="m9 13-2 2 2 2" />
    <path d="m15 13 2 2-2 2" />
  </svg>
);

export const BookOpenIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

export const SettingsIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    version="1.1"
    id="Layer_1"
    xmlns="http://www.w3.org/2000/svg"
    stroke="#000000"
    fill="#0298f5"
  >
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g
      id="SVGRepo_tracerCarrier"
      stroke-linecap="round"
      stroke-linejoin="round"
    ></g>
    {/* Outer gear teeth */}
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58z" />

    {/* Inner circle */}
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const GitPullRequestIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="18" cy="18" r="3" />
    <circle cx="6" cy="6" r="3" />
    <path d="M13 6h3a2 2 0 0 1 2 2v7" />
    <line x1="6" y1="9" x2="6" y2="21" />
  </svg>
);

export const RefreshCwIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 1024 1024"
    width="24"
    height="24"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    transform="matrix(-1, 0, 0, 1, 0, 0)"
    stroke="#ffffff"
  >
    <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
    <g
      id="SVGRepo_tracerCarrier"
      strokeLinecap="round"
      strokeLinejoin="round"
    ></g>
    <g id="SVGRepo_iconCarrier">
      <path
        d="M128.416 929.176a381.336 81.488 0 1 0 762.672 0 381.336 81.488 0 1 0-762.672 0Z"
        fill="#B8CBCD"
      ></path>
      <path
        d="M680.408 762.672h-352l-40 168c0 25.128 102.224 45.448 216 45.448s216-20.32 216-45.448l-40-168z"
        fill="#a6dbed"
      ></path>
      <path
        d="M504.408 992.12c-9.48 0-232-0.696-232-61.448 0-1.248 0.152-2.496 0.44-3.704l40-168a16 16 0 0 1 15.56-12.296h352a16 16 0 0 1 15.56 12.296l40 168c0.288 1.216 0.44 2.456 0.44 3.704 0 60.744-222.52 61.448-232 61.448z m-199.256-62.688c13.12 11.776 85.68 30.688 199.256 30.688s186.144-18.912 199.256-30.688l-35.896-150.76h-326.72l-35.896 150.76z"
        fill="#d7e3e9"
      ></path>
      <path
        d="M504.408 953.336c-9.48 0-228-0.256-228-61 0-8.832 3.16-16.44 12-16.44a16 16 0 0 1 15.856 13.88c10.344 11.68 83.68 31.568 200.144 31.568s189.8-19.88 200.144-31.568a16 16 0 0 1 15.856-13.88c8.832 0 8.664 8.944 8.664 17.776 0 60.744-215.184 59.664-224.664 59.664z"
        fill="#015179"
      ></path>
      <path
        d="M768.944 380.776c-9.52-25.608 0-46.448 0-46.448s-97.352-84.848-111.944-99.44c-14.584-14.584-14.288-26.792-25.008-34.536-10.72-7.744-63.12-23.824-65.504-26.2-2.384-2.384 15.128-20.36 24.536-29.776-7.152-5.36-50.144-5.36-59.08-5.36-8.928 0-10.152-53.256-10.152-80.344-22.328 0-49.104 74.096-49.104 74.096-70.56 0-186.672 96.464-186.672 264.384 0 66.992 42.872 184 58.944 241.16 3.824 13.568 7.992 33.016 8.832 44.36 101.208 0.296 200 0 304 0 0.984-13.336-1.4-31.376-1.4-51.208 0-82.768-157.8-223.896-157.8-234.616 5.36 5.36 26.8 10.128 35.728 10.128 36.32 0 51.808-16.672 80.984-16.672 29.176 0 38.112 46.448 82.768 46.448 44.664 0 49.432-20.84 53-23.824 21.456-14.288 20.848-25.608 17.872-32.152z"
        fill="#a6dbed"
      ></path>
      <path
        d="M454.496 698.8c-33.496 0-66.984-0.032-100.736-0.128a16 16 0 0 1-15.904-14.824c-0.68-9.128-4.232-26.84-8.272-41.2-3.608-12.832-8.536-28.568-14.248-46.792-19.12-61.016-45.296-144.576-45.296-198.704 0-163.496 109.512-270.48 191.352-279.736 12.392-31.656 34.104-74.744 60.424-74.744a16 16 0 0 1 16 16c0 35.448 1.888 55.232 3.576 64.4 48.616 0.536 54.96 5.296 59.248 8.504a16 16 0 0 1 1.712 24.112c-4.4 4.4-7.904 8.016-10.696 10.976 24.168 8.552 41.864 15.04 49.712 20.712 8.344 6.024 12.272 13.464 15.752 20.032 2.848 5.4 5.544 10.504 11.2 16.16 11.232 11.232 77.616 69.472 111.152 98.696 5.336 4.656 6.984 12.272 4.04 18.712-0.192 0.472-6.408 15.336 0.288 33.8 4.464 10.336 6.952 29.8-21.464 49.84-5.184 8.056-18.768 28.128-64.24 28.128-31.472 0-49.264-18.36-62.256-31.76-8.832-9.104-14.536-14.68-20.504-14.68-11.096 0-20.136 3.136-30.6 6.768-11.824 4.104-25.032 8.688-43.024 9.696 63.992 69.536 130.712 148.032 130.712 208.688 0 8.36 0.448 16.424 0.88 24.224 0.56 10.136 1.096 19.712 0.472 28.16a15.984 15.984 0 0 1-15.952 14.824c-34.96 0-69.336 0.032-103.416 0.064-33.512 0.04-66.72 0.072-99.912 0.072z m-86.68-32.096c62.368 0.152 123.96 0.088 186.544 0.032 28.88-0.024 57.976-0.056 87.464-0.064-0.136-2.912-0.304-5.984-0.488-9.216a459.856 459.856 0 0 1-0.928-26c0-54.608-85.272-146.968-126.248-191.352-26.728-28.952-31.544-34.168-31.544-43.264a15.992 15.992 0 0 1 26.752-11.84c4.024 2.448 18.656 5.968 24.968 5.968 16.456 0 27.84-3.952 39.896-8.136 12.096-4.2 24.592-8.536 41.088-8.536 19.824 0 32.392 12.968 43.48 24.408 11.472 11.832 21.368 22.04 39.288 22.04 28.704 0 34.68-9.312 37.544-13.784 1.28-2 2.736-4.264 5.2-6.32 0.44-0.368 0.896-0.712 1.376-1.032 11.408-7.6 12.24-12.056 12.24-12.096-0.152-0.344-0.376-0.816-0.504-1.168a82.456 82.456 0 0 1-3.336-46.792c-23.608-20.624-92.432-80.872-104.92-93.36-9.064-9.064-13.576-17.6-16.872-23.832-2.64-5-4.008-7.472-6.184-9.048-4.936-3.496-29.832-12.296-41.784-16.528-18.8-6.648-22.176-7.848-25.656-11.312-10.136-10.136-2.824-22.088 3.536-29.936a600.08 600.08 0 0 0-26.776-0.52c-16.328 0-23.312-14.008-25.416-58.448a296.992 296.992 0 0 0-18.792 41.632 15.984 15.984 0 0 1-15.048 10.56c-59.56 0-170.672 85.312-170.672 248.384 0 49.24 25.336 130.096 43.832 189.136 5.784 18.464 10.776 34.4 14.512 47.688 2.6 9.192 5.52 21.592 7.448 32.736z"
        fill="#015179"
      ></path>
      <path
        d="M388.4 695.928a16.016 16.016 0 0 1-15.4-11.672c-4.184-14.912-10.904-35.056-18.672-58.376-22.24-66.736-49.92-149.8-49.92-201.48 0-176.192 90.904-298.984 172.496-298.984a16 16 0 1 1 0 32c-57.288 0-140.496 104-140.496 266.984 0 46.488 27.904 130.216 48.28 191.36 7.896 23.704 14.72 44.176 19.12 59.832a16 16 0 0 1-15.408 20.336z"
        fill="#FFFFFF"
      ></path>
      <path
        d="M768.408 722.672c0 22.088-13.024 40-29.096 40H285.504c-16.072 0-29.096-17.912-29.096-40s13.024-40 29.096-40h453.816c16.064 0 29.088 17.912 29.088 40z"
        fill="#a6dbed"
      ></path>
      <path
        d="M739.312 778.672H285.504c-25.288 0-45.096-24.6-45.096-56s19.808-56 45.096-56h453.816c25.288 0 45.096 24.6 45.096 56s-19.816 56-45.104 56z m-453.808-80c-5.336 0-13.096 9.352-13.096 24 0 14.656 7.76 24 13.096 24h453.816c5.336 0 13.096-9.344 13.096-24 0-14.648-7.76-24-13.096-24H285.504zM520.568 273.216a32.008 32.008 0 0 0 63.664-6.592l-63.664 6.592z"
        fill="#015179"
      ></path>
      <path
        d="M502.032 1002.672c-56.304 0-240-5.008-240-69.448 0-2.04 0.256-4.08 0.776-6.056l34.544-132.504h-8.944c-38.28 0-64-37.232-64-72s25.72-72 64-72h34.2l-0.736-2.608c-3.576-12.72-8.496-28.4-14.176-46.56-19.272-61.504-45.664-145.744-45.664-201.096 0-167.4 107.704-274.264 193.64-287.088 20.128-50.048 42.344-75.392 66.136-75.392a24 24 0 0 1 24 24c0 28.168 1.2 46.168 2.48 56.504 41.336 0.848 50.528 5.04 57.152 10.008a24 24 0 0 1 2.56 36.176l-1.952 1.96c19.232 6.936 32.68 12.296 40 17.584 9.848 7.12 14.448 15.808 18.136 22.784 2.68 5.064 4.984 9.44 9.792 14.24 11.496 11.488 83.84 74.872 110.752 98.32a24.008 24.008 0 0 1 6.056 28.072c-0.048 0.136-4.952 12.384 0.472 27.568 4.44 10.528 9.4 34.792-23.064 58.384-9.184 13.576-26.616 30.48-70.104 30.48-34.856 0-54.808-20.576-68.008-34.192-5.288-5.456-11.872-12.248-14.76-12.248-9.744 0-17.792 2.792-27.976 6.328-8.224 2.848-17.704 6.136-29.232 8.232 61.6 67.728 122.296 142.52 122.296 202.6 0 6.48 0.104 11.56 0.192 15.952h47.808c38.872 0 64 28.264 64 72 0 46.352-26.912 80-64 80h-17.456l30.4 124.88c0.456 1.856 0.68 3.76 0.68 5.672 0 64.44-183.696 69.448-240 69.448z m-189.952-74.224c20.096 10.76 90.152 26.224 189.952 26.224 100.064 0 170.24-15.552 190.12-26.312l-35.064-144.008a23.96 23.96 0 0 1 4.456-20.504 23.976 23.976 0 0 1 18.864-9.168h48c8.968 0 16-14.056 16-32 0-24-10.016-24-16-24h-72a24.008 24.008 0 0 1-23.952-25.568c0.472-7.192 0.352-12.28 0.176-19.984a769.76 769.76 0 0 1-0.232-18.4c0-51.48-86.984-145.696-124.128-185.928-27.872-30.184-33.672-36.464-33.672-48.688a24 24 0 0 1 39.24-18.536c4.344 2.056 16.288 4.664 20.488 4.664 15.112 0 25.376-3.568 37.272-7.688 12.128-4.208 25.872-8.984 43.712-8.984 23.2 0 37.632 14.88 49.224 26.84C676.68 408.92 684.224 416 698.088 416c24.336 0 28.712-6.824 30.808-10.104 1.44-2.24 3.4-5.304 6.808-8.144 0.664-0.552 1.352-1.064 2.072-1.544 4.168-2.776 6.52-4.928 7.8-6.296a90.624 90.624 0 0 1-3.656-44.072c-26.84-23.456-89.656-78.512-101.88-90.736-9.92-9.92-14.76-19.072-18.288-25.752-1.424-2.688-3.04-5.744-3.808-6.296-5.032-3.184-28.496-11.488-39.768-15.472-20.232-7.16-23.88-8.448-28.632-13.192-9.28-9.272-8.504-19.464-4.832-28.008a764.76 764.76 0 0 0-12.752-0.104c-17.912 0-26.68-11.424-30.792-37a281.072 281.072 0 0 0-5.888 14.912 24.024 24.024 0 0 1-22.568 15.832c-55.208 0-162.672 84.848-162.672 240.384 0 48.008 25.128 128.2 43.472 186.744 5.808 18.52 10.816 34.52 14.576 47.92l1.416 4.976c3.128 10.944 5.824 20.4 6.832 32.648a24.016 24.016 0 0 1-23.92 25.976h-64c-8.472 0-16 13.424-16 24s7.528 24 16 24h40a24.008 24.008 0 0 1 23.224 30.056l-39.56 151.72z"
        fill="#015179"
      ></path>
    </g>
  </svg>
);

export const GitHubIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

export const GitLabIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m22 13.29-1.91-7.14a.92.92 0 0 0-.89-.65.94.94 0 0 0-.9.66l-1.59 5.27H7.29l-1.59-5.27a.93.93 0 0 0-1.79 0L2 13.29a.92.92 0 0 0 .33 1.06L12 21l9.67-6.65a.92.92 0 0 0 .33-1.06Z" />
  </svg>
);

export const LockIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export const CloudDownloadIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export const ShareIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

export const LinkIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

export const SearchIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const LayoutIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 36 36"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    role="img"
    width="24"
    height="24"
    preserveAspectRatio="xMidYMid meet"
    fill="#000000"
    stroke="#000000"
  >
    <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
    <g
      id="SVGRepo_tracerCarrier"
      strokeLinecap="round"
      strokeLinejoin="round"
    ></g>
    <g id="SVGRepo_iconCarrier">
      <path
        fill="#FFD983"
        d="M0 18c0 9.941 8.059 18 18 18c.295 0 .58-.029.87-.043C24.761 33.393 29 26.332 29 18C29 9.669 24.761 2.607 18.87.044C18.58.03 18.295 0 18 0C8.059 0 0 8.059 0 18z"
      ></path>
      <path
        fill="#66757F"
        d="M29 18C29 9.669 24.761 2.607 18.87.044C28.404.501 36 8.353 36 18c0 9.646-7.594 17.498-17.128 17.956C24.762 33.391 29 26.331 29 18z"
      ></path>
      <circle fill="#FFCC4D" cx="10.5" cy="8.5" r="3.5"></circle>
      <circle fill="#FFCC4D" cx="20" cy="16" r="3"></circle>
      <circle fill="#FFCC4D" cx="21.5" cy="27.5" r="3.5"></circle>
      <circle fill="#FFCC4D" cx="21" cy="6" r="2"></circle>
      <circle fill="#FFCC4D" cx="3" cy="18" r="1"></circle>
      <circle fill="#5B6876" cx="30" cy="9" r="1"></circle>
      <circle fill="#FFCC4D" cx="15" cy="31" r="1"></circle>
      <circle fill="#5B6876" cx="32" cy="19" r="2"></circle>
      <circle fill="#FFCC4D" cx="10" cy="23" r="2"></circle>
    </g>
  </svg>
);

export const CopyIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export const SparklesIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
    <g
      id="SVGRepo_tracerCarrier"
      strokeLinecap="round"
      strokeLinejoin="round"
    ></g>
    <g id="SVGRepo_iconCarrier">
      {" "}
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M15.75 5.99996V10.5817L20.25 15.4567V19.5L14.85 17.25H14.164C14.2486 17.7211 14.3143 18.3821 14.142 18.9632C13.9659 19.5569 13.4881 20.2215 13.1356 20.6687C12.9464 20.9088 12.7667 21.1187 12.6346 21.2684C12.5683 21.3434 12.5134 21.404 12.4746 21.4463C12.4552 21.4674 12.4398 21.484 12.429 21.4957L12.4162 21.5094L12.4125 21.5133L12.4113 21.5145L12.4108 21.5151L11.8348 22.1242L11.2932 21.4844L11.2915 21.4825L11.2881 21.4784L11.2764 21.4644C11.2665 21.4525 11.2525 21.4357 11.235 21.4143C11.2 21.3715 11.1507 21.3104 11.0913 21.2347C10.9731 21.0839 10.8128 20.8723 10.6459 20.6301C10.3367 20.1815 9.91547 19.504 9.79514 18.8955C9.68449 18.3359 9.79889 17.7103 9.92202 17.25H9.15L3.75 19.5V15.4567L8.25 10.5817V5.99996C8.25 5.35551 8.54034 4.80104 8.87841 4.36963C9.21911 3.93484 9.65484 3.56455 10.0602 3.2711C10.4698 2.97466 10.8748 2.73774 11.175 2.57572C11.326 2.49424 11.4525 2.43056 11.5426 2.38666C11.5877 2.36469 11.6238 2.34761 11.6494 2.33567L11.6799 2.32162L11.6889 2.31754L11.6917 2.31624L11.6935 2.31543L12 2.17822L12.3072 2.31577L12.3083 2.31624L12.3111 2.31754L12.3201 2.32162L12.3506 2.33567C12.3762 2.34761 12.4123 2.36469 12.4574 2.38666C12.5475 2.43056 12.674 2.49424 12.825 2.57572C13.1252 2.73774 13.5302 2.97466 13.9398 3.2711C14.3452 3.56455 14.7809 3.93484 15.1216 4.36963C15.4597 4.80104 15.75 5.35551 15.75 5.99996ZM11.4896 17.25C11.4625 17.3292 11.4346 17.4157 11.4078 17.5068C11.2792 17.9448 11.2175 18.3559 11.2666 18.6045C11.3201 18.8746 11.5662 19.3221 11.881 19.7789L11.9023 19.8097C11.9206 19.7869 11.939 19.7637 11.9575 19.7402C12.3185 19.2821 12.6193 18.8218 12.7039 18.5367C12.7799 18.2806 12.7573 17.8699 12.6733 17.4389C12.6605 17.3731 12.6468 17.3098 12.633 17.25H11.4896ZM15.75 16V12.7932L18.75 16.0432V17.25L15.75 16ZM14.25 5.99996V15.75H9.75V5.99996C9.75 5.81598 9.83466 5.58123 10.0591 5.29482C10.2809 5.01178 10.5952 4.73562 10.9398 4.48618C11.2802 4.23973 11.6252 4.0373 11.8875 3.89571C11.9272 3.87428 11.9648 3.85435 12 3.83598C12.0352 3.85435 12.0728 3.87428 12.1125 3.89571C12.3748 4.0373 12.7198 4.23973 13.0602 4.48618C13.4048 4.73562 13.7191 5.01178 13.9409 5.29482C14.1653 5.58123 14.25 5.81598 14.25 5.99996ZM8.25 12.7932V16L5.25 17.25V16.0432L8.25 12.7932Z"
        fill="#006eff"
      ></path>{" "}
    </g>
  </svg>
);

export const ActiveIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M3 5h4" />
    <path d="M21 17v4" />
    <path d="M19 19h4" />
  </svg>
);
export const DownloadIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export const InfoIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

export const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);
