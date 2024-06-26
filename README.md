# Friendly Reminder Bot

This application sends friendly reminder messages via SMS for scheduled events listed in a Notion database. It uses Twilio for sending SMS, OpenAI's GPT-4 for generating message content, and a cron job to check for events every 5 minutes.

## Features
- Fetches events from a Notion database.
- Sends SMS reminders using Twilio.
- Generates friendly reminder messages using OpenAI's GPT-4.
- Uses cron to schedule reminder checks.

## Technologies Used
- **Notion API**: For retrieving event and recipient data.
- **Twilio API**: For sending SMS messages.
- **OpenAI API**: For generating friendly reminder messages.
- **Node-cron**: For scheduling reminder checks.
- **Day.js**: For date and time manipulation.
- **dotenv**: For managing environment variables.

## Prerequisites
- Node.js
- npm
- Twilio account
- Notion account
- OpenAI API key

## Environment Variables
Create a `.env` file in the root of your project and add the following variables:
```env
NOTION_API_KEY=your_notion_api_key
NOTION_DATABASE_ID=your_notion_database_id
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
OPENAI_API_KEY=your_openai_api_key
OPENAI_ORGANIZATION_ID=your_openai_organization_id
OPENAI_PROJECT_ID=your_openai_project_id
```

## Installation
1. Clone the repository:
   ```sh
   git clone https://github.com/yourusername/friendly-reminder-bot.git
   cd friendly-reminder-bot
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Set up environment variables by creating a `.env` file (as described above).

## Usage
1. Start the application:
   ```sh
   node index.js
   ```
   The application will start a cron job that runs every 5 minutes to check for events and send reminders.

## Code Overview

### Initialization
- Load environment variables using `dotenv`.
- Initialize Notion, Twilio, and OpenAI clients.
- Extend Day.js with necessary plugins for time manipulation.

### Core Functions
1. **getRecipientDetails**: Fetches recipient details from Notion.
2. **getTodayEvents**: Retrieves today's events from Notion, filtered by date and reminder times.
3. **markEventAsSent**: Marks an event as sent in Notion.
4. **generateFriendlyMessage**: Uses OpenAI to generate a friendly reminder message.
5. **sendNotifications**: Sends notifications for today's events and marks them as sent.

### Scheduling
- Uses `node-cron` to schedule the `sendNotifications` function to run every 5 minutes.

## Contributing
1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Make your changes.
4. Commit your changes (`git commit -am 'Add new feature'`).
5. Push to the branch (`git push origin feature-branch`).
6. Create a new Pull Request.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact
For any questions or suggestions, feel free to open an issue or contact the repository owner.

---

Feel free to contribute to the project by submitting pull requests, reporting issues, or suggesting new features!