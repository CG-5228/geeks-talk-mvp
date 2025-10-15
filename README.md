# Geeks Talk MVP

Geeks Talk is a real-time chat and voice communication platform designed for discussions around various subjects. This project is built using Next.js 14 with TypeScript, Prisma for database management, and Tailwind CSS for styling.

## Features

- **Real-time Chat**: Users can send and receive messages instantly in chat rooms.
- **Voice Rooms**: Users can join voice rooms for live discussions.
- **Authentication**: Secure user authentication using GitHub and email providers.
- **Moderation**: Built-in moderation tools to ensure a safe chatting environment.
- **Responsive Design**: Fully responsive UI built with Tailwind CSS.

## Project Structure

```
geeks-talk-mvp
├── app
│   ├── api
│   │   ├── auth
│   │   ├── messages
│   │   ├── voice
│   │   └── socket
│   ├── (chat)
│   ├── layout.tsx
│   └── globals.css
├── lib
├── prisma
├── types
├── middleware.ts
├── next.config.ts
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── .env.example
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn
- A PostgreSQL database (or any other supported database)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/geeks-talk-mvp.git
   cd geeks-talk-mvp
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up your environment variables:
   - Copy `.env.example` to `.env` and fill in the required values.

4. Run the Prisma migrations:
   ```
   npx prisma migrate dev
   ```

5. Start the development server:
   ```
   npm run dev
   ```

### Usage

- Navigate to `http://localhost:3000` to access the application.
- Use the authentication options to log in and start chatting or joining voice rooms.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or features.

## License

This project is licensed under the MIT License. See the LICENSE file for details.