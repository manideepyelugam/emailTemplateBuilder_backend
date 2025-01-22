require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
app.use(cors());
app.use(express.json());

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: 'email_builder',
      format: file.mimetype.split('/')[1], 
      public_id: file.originalname.split('.')[0], 
      resource_type: 'image',
    };
  },
});

const upload = multer({ storage });

app.post('/api/uploadImage', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const imageUrl = req.file.path || req.file.url;
  res.json({ imageUrl });
});



app.post('/api/renderAndDownloadTemplate', async (req, res) => {
  try {
    const { backgroundColor, elements } = req.body;

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { background-color: ${backgroundColor}; font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; }
          img { max-width: 100%; height: auto; }
        </style>
      </head>
      <body>
    `;

    elements.forEach((element) => {
      switch (element.type) {
        case 'heading':
          html += `<h1 style="color: ${element.style.color}; text-align: ${element.style.textAlign}; font-size: ${element.style.fontSize};">${element.content}</h1>`;
          break;
        case 'paragraph':
          html += `<p style="color: ${element.style.color}; text-align: ${element.style.textAlign}; font-size: ${element.style.fontSize};">${element.content}</p>`;
          break;
        case 'image':
          html += `<img src="${element.imageUrl}" alt="Uploaded Image">`;
          break;
      }
    });

    html += `</body></html>`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', 'attachment; filename=email-template.html');
    res.send(html);
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({ error: 'Error generating template' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
