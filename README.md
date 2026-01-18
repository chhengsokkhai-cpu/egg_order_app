# 🥚 Telegram Egg Ordering Mini App

A complete Telegram Mini App for ordering fresh eggs with a responsive web interface and Node.js backend.

## Features

- 🎨 **Responsive Design** - Works perfectly on mobile devices
- 🔄 **Real-time Cart** - Live cart updates with quantity controls
- 🎯 **Telegram Integration** - Full Telegram Web App API integration
- 💰 **Order Management** - Complete order processing system
- 🌙 **Theme Support** - Adapts to Telegram's light/dark theme
- 📱 **Native Feel** - Haptic feedback and native UI elements

## Products Available

- **White Eggs** - Farm fresh white eggs (12 pack) - $4.99
- **Brown Eggs** - Organic brown eggs (12 pack) - $6.99
- **Duck Eggs** - Premium duck eggs (6 pack) - $8.99
- **Quail Eggs** - Delicate quail eggs (18 pack) - $12.99

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Integration**: Telegram Web App API
- **Styling**: CSS Variables with Telegram theming

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd telegram-egg-ordering-mini-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Access the app**
   - Open http://localhost:3000 in your browser
   - Or integrate with your Telegram bot

## Telegram Bot Integration

To use this mini app with a Telegram bot:

1. **Create a Telegram Bot**
   - Message @BotFather on Telegram
   - Use `/newbot` command
   - Save your bot token

2. **Set up Mini App**
   - Use `/newapp` command with @BotFather
   - Provide your app URL (e.g., `https://yourdomain.com`)
   - Set app name and description

3. **Configure Bot Menu**
   ```
   /setmenubutton
   @your_bot_name
   🥚 Order Eggs - https://yourdomain.com
   ```

## API Endpoints

### Order Management
- `POST /api/orders` - Place a new order
- `GET /api/orders/:orderId` - Get order status
- `GET /api/admin/orders` - List all orders (admin)
- `PATCH /api/admin/orders/:orderId` - Update order status (admin)

### System
- `GET /health` - Health check endpoint

## Project Structure

```
telegram-egg-ordering-mini-app/
├── index.html          # Main HTML file
├── styles.css          # CSS styling with Telegram theming
├── script.js           # Frontend JavaScript logic
├── server.js           # Express.js backend server
├── package.json        # Node.js dependencies
└── README.md          # This file
```

## Telegram Web App Features Used

- **MainButton** - Primary action button
- **BackButton** - Navigation control
- **HapticFeedback** - Touch feedback
- **ThemeParams** - Dynamic theming
- **InitData** - User information
- **Viewport** - Responsive layout

## Development

### Running in Development Mode

```bash
npm run dev
```

This starts the server with nodemon for auto-reloading on file changes.

### Testing the Mini App

1. **Local Testing**: Open http://localhost:3000 in a mobile browser
2. **Telegram Testing**: Use Telegram's Web App tester or integrate with a test bot

### Adding New Products

1. Update the `products` object in `script.js`
2. Add corresponding HTML in `index.html`
3. Ensure consistent styling in `styles.css`

## Deployment

### Heroku Deployment

1. **Create Heroku app**
   ```bash
   heroku create your-egg-app-name
   ```

2. **Deploy**
   ```bash
   git push heroku main
   ```

3. **Set environment variables** (if needed)
   ```bash
   heroku config:set NODE_ENV=production
   ```

### Other Platforms

The app works on any Node.js hosting platform:
- Vercel
- Netlify
- DigitalOcean App Platform
- AWS Elastic Beanstalk

## Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode
- `TELEGRAM_BOT_TOKEN` - Your Telegram bot token (optional)

## Security Considerations

- **Validate Telegram Data** - In production, validate `initData` from Telegram
- **HTTPS Required** - Telegram Mini Apps require HTTPS in production
- **Rate Limiting** - Implement rate limiting for API endpoints
- **Authentication** - Add proper admin authentication for admin endpoints

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for your own purposes.

## Support

For issues and questions:
- Check the Telegram Mini Apps documentation
- Review the Web App API reference
- Create an issue in this repository

---

**Happy Egg Ordering! 🥚**