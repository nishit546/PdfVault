// server.js

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// ----------------------------------------------------
// Configuration for storing files (Local Storage)
// ----------------------------------------------------

// Define the directory where PDFs will be stored
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Create the upload directory if it doesn't exist
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR);
}

// Set up storage engine using multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        // Use the original file name and append a timestamp to prevent collisions
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// Initialize upload middleware
const upload = multer({
    storage: storage,
    // Filter to only accept PDF files
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('Only PDF files are allowed!'), false);
        }
        cb(null, true);
    }
}).single('pdfFile'); // 'pdfFile' is the name attribute in the HTML form <input>

// ----------------------------------------------------
// Middleware and Static Files
// ----------------------------------------------------

// Allow access from different origins (CORS) - Important for frontend testing
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allows all origins
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Serve the uploaded files statically so they can be viewed at http://localhost:3000/pdfs/[filename]
app.use('/pdfs', express.static(UPLOAD_DIR));

// ----------------------------------------------------
// 0. ROOT ENDPOINT (GET /) - Fixes "Cannot GET /" error
// ----------------------------------------------------
app.get('/', (req, res) => {
    res.send('<h1>Welcome to the PDF Vault Backend!</h1><p>The backend is running successfully. To use the vault, open your <code>index.html</code> file in the browser or access the API endpoints:</p><ul><li>POST /upload (for file uploads)</li><li>GET /pdfs (for the list of files)</li></ul>');
});

// ----------------------------------------------------
// 1. UPLOAD ENDPOINT (POST /upload)
// ----------------------------------------------------

app.post('/upload', (req, res) => {
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(500).json({ success: false, message: 'Multer error: ' + err.message });
        } else if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        
        // Check if a file was actually uploaded
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file selected for upload.' });
        }

        // File was uploaded successfully
        res.json({
            success: true,
            message: 'PDF uploaded successfully!',
            filename: req.file.filename,
            // The public URL to view the file
            url: `http://localhost:${port}/pdfs/${req.file.filename}`
        });
    });
});

// ----------------------------------------------------
// 2. VIEW/LIST ENDPOINT (GET /pdfs)
// ----------------------------------------------------

app.get('/pdfs', (req, res) => {
    fs.readdir(UPLOAD_DIR, (err, files) => {
        if (err) {
            console.error('Error reading upload directory:', err);
            return res.status(500).json({ success: false, message: 'Failed to retrieve files.' });
        }

        // Filter for files ending in .pdf and map them to friendly objects
        const pdfList = files
            .filter(file => file.endsWith('.pdf'))
            .map(file => ({
                // name: file.substring(file.indexOf('-') + 1), // Use this to remove the timestamp prefix
                name: file, // Using the full filename for uniqueness
                url: `http://localhost:${port}/pdfs/${file}` // Creates the public URL
            }));

        res.json({
            success: true,
            pdfs: pdfList
        });
    });
});

// ----------------------------------------------------
// Start Server
// ----------------------------------------------------

app.listen(port, () => {
    console.log(`PDF Vault Backend listening at http://localhost:${port}`);
    console.log(`Upload directory is: ${UPLOAD_DIR}`);
});