VibeChat: A Real-time Chat Application
(Replace this placeholder with an actual screenshot of your running app!)

VibeChat is a modern, real-time chat application built with React and Firebase. It allows users to set a nickname, send messages, see who's typing, and even edit or delete their own messages, all updated in real-time across connected clients.

✨ Live Demo
Experience VibeChat live here:
https://chat-app-afee8.web.app

🚀 Features
Real-time Messaging: Send and receive messages instantly.

Nickname Support: Set a custom nickname for your chat identity.

Typing Indicator: See when other users are typing.

Message Editing: Edit your own sent messages.

Message Deletion: Delete your own sent messages.

Responsive UI: Built with Tailwind CSS for a great experience on any device.

Firebase Integration: Utilizes Firebase Authentication for anonymous sign-in and Firestore for real-time database.

🛠️ Technologies Used
Frontend: React.js

Styling: Tailwind CSS

Build Tool: Vite

Backend/Database/Authentication/Hosting: Google Firebase (Firestore, Authentication, Hosting)

⚙️ Local Setup and Run
To get VibeChat running on your local machine for development:

Prerequisites
Node.js (LTS version recommended)

npm (Node Package Manager, comes with Node.js)

Git

Steps
Clone the repository:

git clone https://github.com/your-username/vibe-chat-app.git
cd vibe-chat-app

(Replace https://github.com/your-username/vibe-chat-app.git with your actual GitHub repository URL)

Install dependencies:

npm install

Firebase Project Setup:

Go to the Firebase Console and create a new project.

In your Firebase project, go to Authentication -> Sign-in method and enable the "Anonymous" provider.

Add a new Web app to your project (</> icon in Project settings). Firebase will provide you with a firebaseConfig object.

Configure Environment Variables (.env file):

In the root directory of your project (vibe-chat-app/), create a new file named .env.

Paste your Firebase configuration details into this file, prefixed with REACT_APP_ (for Vite, it's VITE_ but REACT_APP_ is commonly used and often compatible depending on your setup).

# .env file in your project root

# Firebase Configuration (replace with your actual values from Firebase Console)
REACT_APP_FIREBASE_API_KEY=YOUR_API_KEY_FROM_FIREBASE_CONSOLE
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID_FROM_FIREBASE_CONSOLE
REACT_APP_FIREBASE_APP_ID=YOUR_APP_ID_FROM_FIREBASE_CONSOLE
# REACT_APP_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX (Optional, for Google Analytics)

Important: Ensure your src/App.js correctly reads these environment variables (it should be set up to do so in the latest version I provided).

Run the development server:

npm run dev

Your application should now be running locally, usually at http://localhost:5173/.

☁️ Deployment to Firebase Hosting
To deploy your application to Firebase Hosting:

Prerequisites for Deployment
Firebase CLI installed globally (npm install -g firebase-tools)

Logged in to Firebase CLI (firebase login)

Steps
Build your React application for production:
This creates the optimized static files in the dist folder.

npm run build

Initialize Firebase Hosting in your project (if not already done):

firebase init hosting

Follow the prompts:

Select your Firebase project.

Set your public directory to dist.

Configure as a single-page app (Y).

(Optional) Set up GitHub Actions for CI/CD if desired.

Deploy your application:

firebase deploy --only hosting

After successful deployment, the Firebase CLI will provide you with the live Hosting URL.

🔒 Firestore Security Rules
These are the security rules for your Firestore database, ensuring that only authenticated users can read and write chat data.

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read and write access to public data for any authenticated user
    match /artifacts/{appId}/public/data/{collection}/{document} {
      allow read, write: if request.auth != null;
    }

    // Optional: More restrictive rule for typingStatus if needed,
    // ensuring users can only update their own status.
    // However, the above general rule is sufficient for this app's current logic.
    // match /artifacts/{appId}/public/data/typingStatus/{userId} {
    //   allow read: if request.auth != null;
    //   allow write: if request.auth != null && request.auth.uid == userId;
    // }
  }
}

To apply these rules:

Go to your Firebase Project Console.

Navigate to Firestore Database -> Rules tab.

Replace the existing rules with the ones above and click Publish.

🤝 Contributing
Feel free to fork this repository, open issues, or submit pull requests to improve VibeChat!
