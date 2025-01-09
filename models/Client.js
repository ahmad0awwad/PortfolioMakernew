const mongoose = require('mongoose');

const portSchema = new mongoose.Schema({
    url: {
        type: String,
        required: false,
        unique: true,
        maxlength: 15, 
        match: /^[a-zA-Z\u0600-\u06FF-]+$/,
        set: v => v.toLowerCase(),
       
    },
    name: { type: String, unique: true },
  
    projects: [
        {
            title: { type: String, required: true },
            description: { type: String, required: true },
            imageUrl: { type: String, required: true},
            link: { type: String, required: true, match: /^https?:\/\/.+/ },
          },
    ],
    
   
    socialMedia: [
        {
            name: { type: String, required: true },
            url: { type: String, required: true },
            icon: { type: String, required: false },
        }
    ],
   
    slogan: { type: String, required: false },
    Bio: { type: String, required: false },
    skills: [String],
    education: [
        {
            institution: { type: String, required: true },
            degree: { type: String, required: true },
        }
    ],
    
    
   
    storageLimit: { type: Number, default: 1000 * 1024 * 1024 },
  
}, { timestamps: true });


module.exports = mongoose.model('port', portSchema); 