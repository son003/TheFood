const express = require('express');
const router = express.Router();
const authMiddlewareAvatar = require('../middlewares/authMiddlewareAvatar');  // Đảm bảo bạn đã tạo middleware này
const { upload } = require('../utils/fileUpload');  // Đảm bảo bạn đã cấu hình multer trong utils/fileUpload.js
const { uploadAvatar: uploadAvatarController } = require('../controllers/avatarController');  // Đảm bảo bạn đã tạo controller này

// Route để upload avatar
router.post(
    '/upload-avatar/:userId', 
    authMiddlewareAvatar,  // Middleware xác thực người dùng (nếu có)
    upload.single('avatar'),  // Xử lý file tải lên với multer
    uploadAvatarController  // Controller xử lý upload avatar vào DB
);

module.exports = router;
