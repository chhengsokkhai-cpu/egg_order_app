const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from public directory (CSS, JS, images, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage for orders (use a database in production)
let orders = [];
let orderIdCounter = 1000;

// Small helper for retry backoff
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// API endpoint for placing orders
app.post('/api/orders', async (req, res) => {
    try {
        const orderData = req.body;
        
        // Validate order data
        if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid order data: items are required'
            });
        }
        
        if (!orderData.total || orderData.total <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid order data: total must be greater than 0'
            });
        }
        
        // Generate order ID
        const orderId = `EGG-${orderIdCounter++}`;
        
        // Create order object
        const order = {
            id: orderId,
            items: orderData.items,
            total: orderData.total,
            user: orderData.user || { id: 'anonymous', username: 'Unknown' },
            timestamp: new Date().toISOString(),
            status: 'pending'
        };
        
        // Save order
        orders.push(order);
        
        // Log order (in production, you might want to use a proper logging system)
        console.log('New order received:', {
            orderId: order.id,
            user: order.user.username || order.user.id,
            total: order.total,
            itemCount: order.items.length
        });
        
        // In a real application, you might:
        // 1. Save to database
        // 2. Send notification to restaurant/kitchen
        // 3. Send confirmation email/SMS
        // 4. Update inventory
        
        // Send notification to Telegram bot (await to avoid serverless exit before send)
        try {
            await notifyTelegramBot(order);
        } catch (notifyErr) {
            console.error('Failed to notify Telegram bot:', notifyErr);
        }
        
        res.json({
            success: true,
            orderId: orderId,
            message: 'Order placed successfully',
            estimatedDelivery: '30-45 minutes'
        });
        
    } catch (error) {
        console.error('Error processing order:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// API endpoint for getting order status
app.get('/api/orders/:orderId', (req, res) => {
    const orderId = req.params.orderId;
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
        return res.status(404).json({
            success: false,
            error: 'Order not found'
        });
    }
    
    res.json({
        success: true,
        order: {
            id: order.id,
            status: order.status,
            total: order.total,
            timestamp: order.timestamp,
            items: order.items
        }
    });
});

// API endpoint for admin to view all orders
app.get('/api/admin/orders', (req, res) => {
    // In production, add authentication/authorization here
    res.json({
        success: true,
        orders: orders.map(order => ({
            id: order.id,
            user: order.user.username || order.user.id,
            total: order.total,
            itemCount: order.items.length,
            timestamp: order.timestamp,
            status: order.status
        }))
    });
});

// API endpoint for updating order status (admin)
app.patch('/api/admin/orders/:orderId', (req, res) => {
    const orderId = req.params.orderId;
    const { status } = req.body;
    
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
        return res.status(404).json({
            success: false,
            error: 'Order not found'
        });
    }
    
    if (!['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'].includes(status)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid status'
        });
    }
    
    order.status = status;
    
    res.json({
        success: true,
        message: `Order ${orderId} status updated to ${status}`
    });
});

// Test endpoint to send message to Telegram group
app.post('/api/test-telegram', async (req, res) => {
    try {
        const botToken = '8519893530:AAGkMfSAlM9z_7ABTllGdGCqpgqV1sI3bC4';
        const adminChatId = '-1003516638177'; // Replace with your group chat ID (negative number for groups)
        
        const testMessage = `🧪 TEST MESSAGE\n\nThis is a test to verify Telegram bot can send to group.\nTime: ${new Date().toISOString()}\nChat ID: ${adminChatId}`;
        
        console.log('Sending test message to chat:', adminChatId);
        
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: adminChatId,
                text: testMessage
            })
        });
        
        const responseData = await response.json();
        console.log('Telegram API response:', response.status, responseData);
        
        if (response.ok) {
            res.json({ success: true, message: 'Test message sent to Telegram group', response: responseData });
        } else {
            res.status(500).json({ success: false, error: responseData });
        }
    } catch (error) {
        console.error('Error in test endpoint:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Telegram webhook endpoint for handling button clicks
app.post('/webhook/telegram', async (req, res) => {
    try {
        const update = req.body;
        
        console.log('Webhook received:', JSON.stringify(update, null, 2));
        
        // Handle callback queries (button clicks)
        if (update.callback_query) {
            const callbackQuery = update.callback_query;
            const data = callbackQuery.data;
            const message = callbackQuery.message;
            const callbackQueryId = callbackQuery.id;
            
            // Parse the callback data (format: "action:orderId")
            const [action, orderId] = data.split(':');
            
            // Find the order
            const order = orders.find(o => o.id === orderId);
            
            if (!order) {
                await answerCallbackQuery(callbackQueryId, 'Order not found');
                return res.sendStatus(200);
            }
            
            // Check if order was already processed
            if (order.status !== 'pending') {
                await answerCallbackQuery(callbackQueryId, `Order already ${order.status}`);
                return res.sendStatus(200);
            }
            
            if (action === 'accept') {
                // Update order status
                order.status = 'accepted';
                
                // Answer the callback query
                await answerCallbackQuery(callbackQueryId, 'Order accepted');
                
                // Update the admin message
                const orderItems = order.items.map(item => 
                    `• ${item.quantity}x ${item.name} - ${item.total}`
                ).join('\n');
                
                const updatedMessage = `🥚 ORDER ACCEPTED ✅\n\n` +
                    `Order ID: ${order.id}\n` +
                    `Customer: ${order.user.username || order.user.first_name || 'Anonymous'}\n` +
                    `User ID: ${order.user.id}\n\n` +
                    `Items:\n${orderItems}\n\n` +
                    `⏰ Time: ${new Date(order.timestamp).toLocaleString()}\n` +
                    `✅ Status: ACCEPTED`;
                
                await editMessageText(
                    message.chat.id,
                    message.message_id,
                    updatedMessage,
                    {
                        inline_keyboard: [
                            [
                                { text: '✅ Order Accepted', callback_data: 'accepted' }
                            ]
                        ]
                    }
                );
                
                // Send notification to customer
                const customerMessage = `✅ Your order has been accepted!\n\n` +
                    `Order ID: ${order.id}\n` +
                    `Total: ${order.total}៛\n\n` +
                    `We're preparing your order now. You'll be notified when it's ready!`;
                
                await sendMessage(order.user.id, customerMessage);
                
                console.log(`Order ${orderId} accepted by admin`);
                
            } else if (action === 'deny') {
                // Update order status
                order.status = 'denied';
                
                // Answer the callback query
                await answerCallbackQuery(callbackQueryId, 'Order denied');
                
                // Update the admin message
                const orderItems = order.items.map(item => 
                    `• ${item.quantity}x ${item.name} - ${item.total}`
                ).join('\n');
                
                const updatedMessage = `❌ ORDER DENIED\n\n` +
                    `Order ID: ${order.id}\n` +
                    `Customer: ${order.user.username || order.user.first_name || 'Anonymous'}\n` +
                    `User ID: ${order.user.id}\n\n` +
                    `Items:\n${orderItems}\n\n` +
                    `⏰ Time: ${new Date(order.timestamp).toLocaleString()}\n` +
                    `❌ Status: DENIED`;
                
                await editMessageText(
                    message.chat.id,
                    message.message_id,
                    updatedMessage,
                    {
                        inline_keyboard: [
                            [
                                { text: '❌ Order Denied', callback_data: 'denied' }
                            ]
                        ]
                    }
                );
                
                // Send notification to customer
                const customerMessage = `❌ Sorry, your order could not be accepted at this time.\n\n` +
                    `Order ID: ${order.id}\n` +
                    `Total: ${order.total}៛\n\n` +
                    `Please try again later or contact us for assistance.`;
                
                await sendMessage(order.user.id, customerMessage);
                
                console.log(`Order ${orderId} denied by admin`);
            } else {
                console.log(`Unknown action: ${action} for order: ${orderId}`);
                await answerCallbackQuery(callbackQueryId, 'Unknown action');
            }
        } else {
            console.log('Webhook received but no callback_query found. Update type:', update.message ? 'message' : 'unknown');
        }
        
        // Always return 200 to acknowledge receipt (Telegram requires this)
        res.sendStatus(200);
    } catch (error) {
        console.error('Webhook error:', error);
        console.error('Error stack:', error.stack);
        // Still return 200 to prevent Telegram from retrying excessively
        res.sendStatus(200);
    }
});

async function answerCallbackQuery(callbackQueryId, text) {
    const botToken = '8519893530:AAGkMfSAlM9z_7ABTllGdGCqpgqV1sI3bC4';
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            callback_query_id: callbackQueryId,
            text: text
        })
    });
}

async function editMessageText(chatId, messageId, text, replyMarkup = null) {
    const botToken = '8519893530:AAGkMfSAlM9z_7ABTllGdGCqpgqV1sI3bC4';
    const payload = {
        chat_id: chatId,
        message_id: messageId,
        text: text
    };
    if (replyMarkup) {
        payload.reply_markup = replyMarkup;
    }
    await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
}

async function sendMessage(chatId, text) {
    const botToken = '8519893530:AAGkMfSAlM9z_7ABTllGdGCqpgqV1sI3bC4';
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: text
        })
    });
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        orders: orders.length
    });
});

// Endpoint to get chat updates (to find your chat ID)
app.get('/api/get-chat-id', async (req, res) => {
    const botToken = '8519893530:AAGkMfSAlM9z_7ABTllGdGCqpgqV1sI3bC4';
    
    try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to setup webhook manually
app.post('/api/setup-webhook', async (req, res) => {
    try {
        await setupWebhook();
        res.json({ success: true, message: 'Webhook setup initiated' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint to check webhook status
app.get('/api/webhook-status', async (req, res) => {
    const botToken = '8519893530:AAGkMfSAlM9z_7ABTllGdGCqpgqV1sI3bC4';
    try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
        const data = await response.json();
        res.json({ success: true, webhookInfo: data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint to check webhook status
app.get('/api/webhook-status', async (req, res) => {
    const botToken = '8519893530:AAGkMfSAlM9z_7ABTllGdGCqpgqV1sI3bC4';
    try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
        const data = await response.json();
        res.json({ success: true, webhookInfo: data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Something went wrong!'
    });
});

// Fallback to index.html for client-side routing (SPA)
app.get('*', (req, res) => {
    // Return 404 JSON for API routes that don't exist
    if (req.path.startsWith('/api')) {
        return res.status(404).json({
            success: false,
            error: 'API endpoint not found'
        });
    }
    // Serve index.html for all other routes (SPA routing)
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Function to notify Telegram bot
async function notifyTelegramBot(order) {
    const botToken = '8519893530:AAGkMfSAlM9z_7ABTllGdGCqpgqV1sI3bC4';
    const adminChatId = '-1003516638177'; // Replace with your group chat ID (negative number for groups)
    const maxAttempts = 3;
    
    const orderItems = order.items.map(item => 
        `• ${item.quantity}x ${item.name} - ${item.total}`
    ).join('\n');
    
    const message = `🥚 NEW ORDER RECEIVED!\n⏳ PENDING APPROVAL\n\n` +
        `Order ID: ${order.id}\n` +
        `Customer: ${order.user.username || order.user.first_name || 'Anonymous'}\n` +
        `User ID: ${order.user.id}\n\n` +
        `Items:\n${orderItems}\n\n` +
        `⏰ Time: ${new Date(order.timestamp).toLocaleString()}`;
    
    // Send to admin group with retry
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: adminChatId,
                    text: message,
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '✅ Accept', callback_data: `accept:${order.id}` },
                                { text: '❌ Deny', callback_data: `deny:${order.id}` }
                            ]
                        ]
                    }
                })
            });

            const body = await response.json();
            if (response.ok) {
                console.log('Telegram notification sent to admin group successfully');
                break;
            } else {
                console.error(`Admin notification failed (attempt ${attempt}/${maxAttempts}):`, body);
            }
        } catch (adminError) {
            console.error(`Error sending admin notification (attempt ${attempt}/${maxAttempts}):`, adminError);
        }

        if (attempt < maxAttempts) {
            await sleep(300 * attempt); // simple backoff
        }
    }
    
    // Always try to send confirmation to customer (independent of admin notification) with retry
    const customerMessage = `✅ Your order has been placed!\n\nOrder ID: ${order.id}\n\nWe'll notify you when it's ready.`;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const customerResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: order.user.id,
                    text: customerMessage
                })
            });

            const body = await customerResponse.json();
            if (customerResponse.ok) {
                console.log('Customer confirmation sent successfully');
                break;
            } else {
                console.error(`Customer confirmation failed (attempt ${attempt}/${maxAttempts}):`, body);
            }
        } catch (customerError) {
            console.error(`Error sending customer confirmation (attempt ${attempt}/${maxAttempts}):`, customerError);
        }

        if (attempt < maxAttempts) {
            await sleep(300 * attempt);
        }
    }
}

// Setup Telegram webhook
async function setupWebhook() {
    const botToken = '8519893530:AAGkMfSAlM9z_7ABTllGdGCqpgqV1sI3bC4';
    // Use environment variable for webhook URL, fallback to production URL
    const webhookUrl = process.env.WEBHOOK_URL || `https://telegram-egg-ordering-mini-app.vercel.app/webhook/telegram`;
    
    try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: webhookUrl
            })
        });
        
        const result = await response.json();
        console.log('Webhook setup result:', result);
        if (result.ok) {
            console.log(`✅ Webhook configured: ${webhookUrl}`);
        } else {
            console.error('❌ Webhook setup failed:', result.description);
        }
    } catch (error) {
        console.error('Error setting up webhook:', error);
    }
}

// Export the app for Vercel serverless functions
module.exports = app;

// Only start the server if running locally (not on Vercel)
if (require.main === module) {
    app.listen(PORT, '0.0.0.0', () => {
        const localIP = '192.168.1.11'; // Your local IP address
        console.log(`🥚 Egg Ordering Mini App Server running on port ${PORT}`);
        console.log(`📱 Access the app locally: http://localhost:${PORT}`);
        console.log(`🌐 Access from other devices: http://${localIP}:${PORT}`);
        console.log(`🔧 Admin orders: http://${localIP}:${PORT}/api/admin/orders`);
        console.log(`❤️  Health check: http://${localIP}:${PORT}/health`);
        
        // Setup Telegram webhook (only in local development)
        setupWebhook();
    });
}
