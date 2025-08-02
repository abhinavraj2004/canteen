# **App Name**: Campus Canteen

## Core Features:

- Real-time Menu Display: Display the daily menu fetched in real-time from Firestore, organized by category (Snacks, Main Course, Beverage), showing item name and price. Show an empty state message when the menu hasn't been populated.
- Biriyani Token Booking: Enable students to view remaining Biriyani tokens and book them (one token/student/day), including real-time status display ("Booking is LIVE!" or "Booking is CLOSED") and token count.
- User Authentication: Provide user authentication with 'student' role upon signup, using email/password and Google Sign-In.
- Student Dashboard: Enable viewing of the booking status for students and a basic feedback submission to leave rating/comment.
- Admin Dashboard: Manage token settings (activate/deactivate, set total tokens) and perform menu CRUD operations.
- Firebase Integration: Establish a structured Firebase project using Authentication and Firestore for menu items, settings, and booking data, which are required to manage the canteen application effectively.

## Style Guidelines:

- Primary color: A warm, inviting yellow (#FFC107) to evoke a sense of energy and appetite. The yellow helps add some dynamism.
- Background color: Light yellow (#FAF8EB), desaturated enough not to be tiring when viewed on a screen.
- Accent color: Analogous orange (#FF9800), used on elements to highlight them or for primary calls to action. This accent makes a distinction in the presentation.
- Font pairing: 'Poppins' (sans-serif) for headlines, providing a modern and fashionable feel; 'PT Sans' (sans-serif) for body text to provide more readability.
- Use consistent and recognizable icons for menu categories, token status, and user actions.
- Mobile-first, card-based layout, ensuring information is easily accessible and digestible on smaller screens, without horizontal scrolling.
- Use subtle animations for feedback and transitions.