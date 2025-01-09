require('dotenv').config();

// bcrypt.hash('12', 10, (err, hash) => {
//     if (err) throw err;
//     console.log("Hashed Password:", hash);
// });
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const upload = require('./middleware/multerConfig.js'); 
const path = require('path');
const Client = require('./models/Client'); 
const fs = require('fs');
const axios = require('axios'); 
const session = require('express-session');
const rateLimit = require('express-rate-limit');

const app = express();

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/yourDatabaseName')

    .then(() => {
        console.log('MongoDB Connected');
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err);
    });

   // هذا عشان تخلي الكود يخدم الروت دايركت والسطر الثاني عشان يخدم فايلات فولدر الاستس
   app.use(express.static(path.join(__dirname))); 
   app.use('/assets', express.static(path.join(__dirname, 'assets')));
   app.use('/public', express.static(path.join(__dirname, 'public')));
   app.use('/uploads', express.static('uploads'));


    app.use(session({
        secret: '123',
        resave: false,
        saveUninitialized: true,
        cookie: { maxAge: 1000 * 60 * 60 } // Optional: set cookie expiration (e.g., 1 hour)
    }));

// Set up middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '50mb' }));
app.set('view engine', 'ejs');

app.use((req, res, next) => {
    if (req.url.endsWith('.html')) {
      const newUrl = req.url.slice(0, -5);
      return res.redirect(301, newUrl);
    }
    next();
  });
  
  //url checking
  const cooldowns = {}; // Track cooldowns per IP


  const checkUrlLimiter = rateLimit({
    windowMs: 40000, // 40-second window
    max: 5, // allow 5 request
    message: 'Too many requests, please try again later.',
    handler: (req, res) => {
        console.log(`Rate limit exceeded for IP: ${req.ip}`); // Log when limit is hit
        res.status(429).send('Too many requests, please try again later.');
    }
});



 


app.use(async (req, res, next) => {
    if (req.session.userId && !req.user) {
        try {
            const user = await Client.findById(req.session.userId).select('name role');
            if (user) {
                req.user = user;
                console.log("User retrieved in session middleware:", req.user);
            }
        } catch (err) {
            console.error("Error fetching user:", err);
        }
    }
    next();
});





const uploadDirectories = [
    './public/uploads/logos',
    './public/uploads/gallery',
    './public/uploads/projects', // Add projects directory
];

uploadDirectories.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Directory created: ${dir}`);
    }
});


//socila media
const socialMediaPlatforms = {
    'gmail': '/public/images/gmail.png',
    'linkedin': '/public/images/link.png',
    'WhatsApp': '/public/images/whatsapp-icon.png',
    
};

console.log(socialMediaPlatforms['WhatsApp']); // Should log '/public/images/whatsapp-icon.png'


































app.post('/api/check-duplicate-name', async (req, res) => {
    const { name } = req.body;
    try {
        const client = await Client.findOne({ name });
        res.json({ isDuplicate: !!client });
    } catch (error) {
        console.error('Error checking duplicate name:', error);
        res.status(500).json({ error: 'Server error' });
    }
});






//Main page

// هذا عشان تخليه يخدم فاليل انديكس (/)
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/adminForm', (req, res) => {
    const { email = '', password = '', from = '' } = req.query;
    res.render('adminForm', { email, password, from });
});












// //checking url
app.get('/check-url/:url', checkUrlLimiter, async (req, res) => {
    try {
        let url = req.params.url.toLowerCase();

        // Replace all spaces with hyphens
        url = url.replace(/\s+/g, '-');

        // Allow only letters and hyphens, and limit length to 15 characters
        const urlRegex = /^[a-zA-Z\u0600-\u06FF-]{1,15}$/;

        // Validate the URL format
        if (!urlRegex.test(url)) {
            return res.json({ 
                valid: false, 
                message: 'الرابط يجب أن يحتوي فقط على أحرف إنجليزية و عربيه وشرطات (حد أقصى 10). ولا يسمح بالأرقام أو الرموز الخاصة.' 
            });
        }

        // Check for existing URL in the database
        const existingClient = await Client.findOne({ url });
        if (existingClient) {
            return res.json({ 
                valid: false, 
                message: 'الرابط غير متاح. يرجى اختيار رابط آخر.' 
            });
        }

        // Successful validation, URL is available
        return res.json({ 
            valid: true, 
            personalizedUrl: `https://www.reachpluss.com/${url}`, 
            message: `الرابط متاح! رابط المشاركة سيكون: https://www.reachpluss.com/${url}` 
        });
    } catch (error) {
        console.error('Error checking URL:', error);
        res.status(500).json({ 
            valid: false, 
            message: 'حدث خطأ أثناء التحقق. حاول مرة أخرى.' 
        });
    }
});




app.get('/:clientUrl', async (req, res) => {
    try {
        
        const client = await Client.findOne({ url: req.params.clientUrl });

        if (client) {
            client.pageVisits += 1;
        await client.save();
            const isOwner = req.session.userId === client._id.toString();

            const isAuthenticated = req.session.isAuthenticated || false;

            if (req.query.preview === 'true' && !isAuthenticated) {
                return res.redirect(`/${client.url}`);
            }
            const previewMode = isAuthenticated && req.query.preview === 'true';

                        res.render('clientPage', { client, previewMode, storageUsed: client.storageUsed,isAuthenticated });
        } else {
            res.status(404).send('Client not found');
        }
    } catch (error) {
        console.error('Error fetching client:', error);
        res.status(500).send('Server error');
    }
});

// Define the API endpoint for name duplication check
app.get('/check-name/:name', async (req, res) => {
    try {
        const name = req.params.name.trim().toLowerCase();
        console.log('Checking duplication for name:', name); // Debugging log

        const existingClient = await Client.findOne({ name });
        if (existingClient) {
            return res.json({ valid: false, message: 'الاسم غير متوفر.' });
        }

        return res.json({ valid: true, message: 'الاسم متاح!' });
    } catch (error) {
        console.error('Error checking name:', error); // Debugging log
        res.status(500).json({ valid: false, message: 'خطأ في التحقق من الاسم.' });
    }
});

























app.get('/clients/:id', async (req, res) => {
    try {
        const clientId = req.params.id;
        const client = await Client.findById(clientId);
        console.log('Client Gallery:', client.gallery);
        if (client) {
            const previewMode = req.query.preview === 'true';
            res.render('clientPage', { client, previewMode });
        } else {
            res.status(404).send('Client not found');
        }
    } catch (error) {
        console.error('Error fetching client:', error);
        res.status(500).send('Server error');
    }
});








































app.post('/adminForm', upload.any(), async (req, res) => {
    try {
        console.log('Body:', req.body);
        console.log('Files:', req.files);

        const { url, name, Bio, slogan, education, socialMedia, skills, projects } = req.body;

        // Validate URL
        const formattedUrl = url.trim().toLowerCase().replace(/\s+/g, '-');
        if (!/^[a-zA-Z0-9\u0600-\u06FF-]{1,15}$/.test(formattedUrl)) {
            return res.status(400).send('Invalid URL format.');
        }

        // Process education
        const educationData = Array.isArray(req.body.education)
        ? req.body.education.map(edu => ({
            institution: edu.institution.trim(),
            degree: edu.degree.trim(),
        }))
        : [];
    

        // Process social media
        const socialMediaData = Array.isArray(socialMedia)
            ? socialMedia.map(media => ({
                name: media.name.trim(),
                url: media.url.trim(),
                icon: socialMediaPlatforms[media.name] ,
            }))
            : [];

        // Process skills
        const skillsData = Array.isArray(req.body.skills)
        ? req.body.skills.map(skill => (typeof skill === 'string' ? skill.trim() : skill.name.trim()))
        : [];
    

        // Process projects
        const processedProjects = req.files
            .filter(file => file.fieldname.startsWith('projects'))
            .map(file => {
                const index = file.fieldname.match(/\d+/)[0];
                return {
                    title: projects[index]?.title.trim() || '',
                    description: projects[index]?.description.trim() || '',
                    imageUrl: `/public/uploads/projects/${file.filename}`,
                    link: projects[index]?.link.trim() || '',
                };
            });

        // Save data to the database
        const newClient = new Client({
            url: formattedUrl,
            name,
            Bio,
            slogan,
            education: educationData,
            socialMedia: socialMediaData,
            skills: skillsData,
            projects: processedProjects,
        });

        await newClient.save();

        res.redirect(`/${encodeURIComponent(formattedUrl)}`);
    } catch (error) {
        console.error('Error processing form:', error);
        res.status(500).send('Server error: ' + error.message);
    }
});































































// Start the server
const PORT = 8012;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
