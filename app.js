const express = require("express");
const app = express();
const crypto = require("crypto");
const bodyParser = require("body-parser");
const path = require("path");
const mongoose = require("mongoose");
const multer = require("multer");
const GridFsStorage = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const methodOverride = require("method-override");

app.use(bodyParser.json());
app.use(methodOverride("_method"));

mongoose.connect("mongodb://localhost:27017/mongoose_files", { useNewUrlParser: true });
var conn = mongoose.connection;
conn.on("error", console.error.bind(console, "connection error:"));

//Init gfs
let gfs;
conn.once("open", () => {
	//Initialize stream
	gfs = Grid(conn.db, mongoose.mongo);
	gfs.collection("uploads");
});

app.set("view engine", "ejs");

//Create Storage Engine

const storage = new GridFsStorage({
	url: "mongodb://localhost:27017/mongoose_files",
	file: (req, file) => {
		return new Promise((resolve, reject) => {
			crypto.randomBytes(16, (err, buf) => {
				if (err) {
					return reject(err);
				}
				const filename = buf.toString("hex") + path.extname(file.originalname);
				const fileInfo = {
					filename: filename,
					bucketName: "uploads",
				};
				resolve(fileInfo);
			});
		});
	},
});
const upload = multer({ storage });

// @route GET /
// @desc Loads form

app.get("/", (req, res) => {

    gfs.files.find().toArray((err,files)=>{
        console.log(files.length);
        if(!files || files.length==0){
            res.render("index",{files : false});
        }
        else{
            files.map((file)=>{
                if (file.contentType === "image/jpeg" || file.contentType === "image/png") {
                    file.isImage = true;
                }
                else{
                    file.isImage=false;
                }
            })
            res.render("index",{files:files});
        }
    })

});

//@route POST /upload
//@desc upload file to DB

//.single() because uploading a single file
app.post("/upload", upload.single("file"), (req, res) => {
	// res.json({file : req.file});
	res.redirect("/");
});

//@route GET /files
// @desc display all files in JSON

app.get("/files", (req, res) => {
	gfs.files.find().toArray((err, files) => {
		//Check if Files exist
		if (!files || files.length === 0) {
			return res.status(404).json({
				err: "No Files Exists",
			});
		} else {
			return res.json(files);
		}
	});
});

//@route GET /files
// @desc display single file object

app.get("/files/:filename", (req, res) => {
	gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
		if (!file || file.length == 0) {
			return res.status(404).json({
				err: "No File Exists"
			});
		} else {
			return res.json(file);
		}
	});
});

//@route GET /image/:filename
// @desc display image

app.get("/image/:filename", (req, res) => {
	gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
		if (!file || file.length == 0) {
			return res.status(404).json({
				err: "No File Exists",
			});
		} else {
			//Check if img
			if (file.contentType === "image/jpeg" || file.contentType === "image/png") {
				//Read output
				const readstream = gfs.createReadStream(file.filename);
				readstream.pipe(res);
            }
            else{
                res.status(404).json({
                    err : "Not an Image"
                })
            }
		}
	});
});

//@route DELETE /files/:id
//@desc delete file
app.delete('/files/:id',(req,res)=>{
    console.log("deleting");
    gfs.remove({_id : req.params.id , root : 'uploads'},
    (err,gridStore)=>{
        if(err){
            return res.status(404).json({
                err : err
            });
        }
        else{
            console.log(req.params.id);
            res.redirect('/');
        };
    });
});

app.listen(5000, () => console.log("Server Started"));
