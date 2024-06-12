import { Client as NotionClient } from '@notionhq/client';
import twilio from 'twilio';
import cron from 'node-cron';
import dotenv from 'dotenv';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isBetween from 'dayjs/plugin/isBetween';
import OpenAI from "openai";

dotenv.config();

const openai = new OpenAI({
    organization: process.env.OPENAI_ORGANIZATION_ID,
    project: process.env.OPENAI_PROJECT_ID,
    apiKey: process.env.OPENAI_API_KEY,
});

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);

const notion = new NotionClient({ auth: process.env.NOTION_API_KEY });
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

interface EventProperties {
    Recipient: {
        relation: Array<{ id: string }>
    };
    Name: {
        title: Array<{ plain_text: string }>
    };
    Voice: {
        rich_text: Array<{ plain_text: string }>
    };
    Note: {
        rich_text: Array<{ plain_text: string }>
    };
    Date: {
        date: {
            start: string
        }
    };
    Sent: {
        checkbox: boolean
    };
    'Remind at'?: {
        date: {
            start: string
        }
    };
}

interface RecipientProperties {
    Name: {
        title: Array<{ plain_text: string }>
    };
    Phone: {
        phone_number: string
    };
}

const getRecipientDetails = async (recipientId: string): Promise<RecipientProperties> => {
    const response = await notion.pages.retrieve({ page_id: recipientId });
    // @ts-expect-error
    return response.properties as unknown as RecipientProperties;
};

const getTodayEvents = async (): Promise<any[]> => {
    const today = dayjs().tz('America/New_York').format('YYYY-MM-DD');
    const currentTime = dayjs().tz('America/New_York');

    const response = await notion.databases.query({
        database_id: process.env.NOTION_DATABASE_ID!,
        filter: {
            or: [
                {
                    and: [
                        {
                            property: 'Date',
                            date: {
                                equals: today,
                            },
                        },
                        {
                            property: 'Sent',
                            checkbox: {
                                equals: false,
                            },
                        },
                    ],
                },
                {
                    and: [
                        {
                            property: 'Remind at',
                            date: {
                                on_or_after: today,
                            },
                        },
                        {
                            property: 'Sent',
                            checkbox: {
                                equals: false,
                            },
                        },
                    ],
                },
            ],
        },
    });

    return response.results.filter(event => {
        // @ts-expect-error
        const properties = event.properties as unknown as EventProperties;
        const remindAt = properties['Remind at']?.date.start;

        if (remindAt) {
            const remindAtTime = dayjs(remindAt);
            const fiveMinutesAgo = currentTime.subtract(5, 'minutes');
            const fiveMinutesLater = currentTime.add(5, 'minutes');
            return remindAtTime.isBetween(fiveMinutesAgo, fiveMinutesLater);
        } else {
            const eventTime = dayjs().tz('America/New_York').set('hour', 8).set('minute', 0).set('second', 0);
            return currentTime.isSame(eventTime, 'minute');
        }
    });
};

const markEventAsSent = async (eventId: string): Promise<void> => {
    await notion.pages.update({
        page_id: eventId,
        properties: {
            Sent: {
                checkbox: true,
            },
        },
    });
};

const generateFriendlyMessage = async (recipientName: string, eventName: string, eventDateTime: string, reminderVoice: string, reminderNotes: string): Promise<string> => {
    const prompt = `Write a friendly reminder message for ${recipientName} about their event '${eventName}' scheduled at ${eventDateTime}. Here's some more context about the event: '${reminderNotes}'. Use the voice of ${reminderVoice}.`;

    const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
            {
                role: 'system',
                content: 'You are a friendly reminder bot.',
            },
            {
                role: 'user',
                content: prompt,
            }
        ],
    });

    return response.choices[0].message.content?.trim() || 'Just a friendly reminder :)';
};

const sendNotifications = async (): Promise<void> => {
    const events = await getTodayEvents();

    for (const event of events) {
        const properties = event.properties as unknown as EventProperties;
        const recipientId = properties.Recipient.relation[0]?.id;
        if (!recipientId) {
            console.error('No recipient found for event:', event.id);
            continue;
        }

        const recipientDetails = await getRecipientDetails(recipientId);
        const recipientName = recipientDetails.Name.title[0]?.plain_text || 'Unknown';
        const phoneNumber = recipientDetails.Phone.phone_number || undefined;
        const eventName = properties.Name.title[0]?.plain_text || 'No Event Name';
        const eventDateTime = properties.Date.date.start || '';
        const reminderVoice = properties.Voice.rich_text[0]?.plain_text || '';
        const reminderNote = properties.Note.rich_text[0]?.plain_text || '';

        if (phoneNumber) {
            const message = await generateFriendlyMessage(recipientName, eventName, eventDateTime, reminderVoice, reminderNote);

            await twilioClient.messages.create({
                body: message,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: phoneNumber,
            });

            // Mark the event as sent
            await markEventAsSent(event.id);
        }
    }
};

cron.schedule('*/5 * * * *', () => {
    sendNotifications()
        .then(() => console.log('Notifications sent and marked as sent'))
        .catch((err) => console.error('Error sending notifications:', err));
}, {
    scheduled: true,
    timezone: "America/New_York"
});
