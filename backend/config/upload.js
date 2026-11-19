
import multer from "multer";

const allowedMimeTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1
  },
  fileFilter(req, file, callback) {
    const extension = file.originalname
      .split(".")
      .pop()
      ?.toLowerCase();

    const validExtension = ["pdf", "docx"].includes(extension);
    const validMime = allowedMimeTypes.includes(file.mimetype);

    if (!validExtension || !validMime) {
      return callback(
        new Error("Only PDF and DOCX files are allowed.")
      );
    }

    callback(null, true);
  }
});

export default upload;
