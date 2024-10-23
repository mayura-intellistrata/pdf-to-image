const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { convert } = require('pdf-poppler');

const app = express();
const port = 3000;

// Ensure 'uploads' folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from the uploads folder
app.use('/uploads', express.static('uploads'));

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});

const upload = multer({ storage });

// Convert PDF to images
const convertPDFToImages = async (pdfFilePath) => {
  const outputDir = pdfFilePath.replace('.pdf', '');

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const opts = {
    format: 'jpeg',  // You can use png if needed
    out_dir: outputDir,
    out_prefix: path.basename(pdfFilePath, path.extname(pdfFilePath)),
    page: null // Convert all pages
  };

  try {
    await convert(pdfFilePath, opts);
    const files = fs.readdirSync(outputDir);
    return files.map(file => path.join(outputDir, file));
  } catch (err) {
    console.error('Error converting PDF to images:', err);
    throw err;
  }
};

// API endpoint to handle PDF file upload and conversion
app.post('/convert-pdf', upload.single('pdf'), async (req, res) => {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }
  
    const pdfFilePath = path.join(__dirname, req.file.path);
  
    try {
      const imagePaths = await convertPDFToImages(pdfFilePath);
  
      // Get the base URL dynamically from the request object
      const baseUrl = `${req.protocol}://${req.get('host')}`;
  
      // Convert image file paths to URLs
      const imageUrls = imagePaths.map(imagePath => {
        const relativePath = imagePath.replace(__dirname, '');
        return `${baseUrl}${relativePath.replace(/\\/g, '/')}`;  // Use the dynamic base URL
      });
  
      res.json({ images: imageUrls });
    } catch (err) {
      res.status(500).send('Error processing PDF.');
    }
  });
  

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
