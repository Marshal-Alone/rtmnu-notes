# NoteNinja

A modern web application for sharing and managing educational notes. Built with HTML, CSS, and vanilla JavaScript.

## Features

- Upload and download notes
- Support for multiple file types (PDF, images, text, audio, video)
- Drag and drop file upload
- Real-time search functionality
- Progress tracking for uploads
- Responsive design
- Modern UI with dark/light mode support

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd noteninja
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:

```
MONGODB_URI=your_mongodb_connection_string
PORT=3000
NODE_ENV=development
```

4. Create the uploads directory:

```bash
mkdir public/uploads
```

## Running the Application

1. Start the server:

```bash
npm start
```

2. Open your browser and navigate to:

```
http://localhost:3000
```

## Development

For development with auto-reload:

```bash
npm run dev
```

## Project Structure

```
noteninja/
├── public/
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   └── uploads/
├── server.js
├── package.json
├── .env
└── README.md
```

## API Endpoints

- `POST /api/notes` - Upload a new note
- `GET /api/notes` - Get all notes
- `GET /api/notes/search?query=<search_term>` - Search notes by title

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
