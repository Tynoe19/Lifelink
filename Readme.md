This project is a centralized organ donation web application built for Northern Cyprus, with plans for international scalability. The core goal is to connect organ donors and recipients based on medical compatibility and location proximity, streamlining the matching process and communication between them.

👥 User Roles
Donors: Register with relevant health and location data. Donors are kept anonymous to recipients for privacy and security.

Recipients: Register with required medical and personal information to be eligible for matches.

🔐 Key Features
Anonymous In-App Messaging: Once a match is found, donors and recipients can communicate anonymously within the platform.

No Direct Hospital Involvement: Hospitals are not integrated directly. However, the app recommends nearby transplant-capable hospitals to matched users based on location.

Automated Matching Algorithm: Matches are made using a centralized algorithm considering:

Organ type & compatibility

Medical urgency

Age, weight, and height

Geographic proximity

🛠️ Tech Stack
Backend: Django + Django REST Framework

Frontend: React (Vite)

Authentication: JWT-based user login system

Architecture: Centralized with some decentralized-inspired decision-making (user autonomy post-match)

📌 Current Focus
Setting up REST API endpoints for donor/recipient registration and donation listings

Implementing JWT authentication

Integrating donor-recipient matching logic

Building the anonymous chat system