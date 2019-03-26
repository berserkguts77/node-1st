// 모듈
const express = require('express');
const app = express();
const cookieParser = require('cookie-parser'); //쿠키 등록
const expressSession = require('express-session');  //세션 등록
const bodyParser = require('body-parser');
const mysql = require('mysql');
const multer = require('multer');
const myMulter = multer({ dest:'uploads/', limits:{fileSize: 5 * 1024  *   1024 }});
// mysql
const conn = mysql.createConnection({
    host:'localhost',
    user:'root',    // db user
    password :'java0000',   // db password
    database : 'nodedb'  // db database
});
// 서버 설정

app.set('views',__dirname + '/views');
app.set('view engine','ejs');
 
// 정적 미들웨어
app.use(express.static(__dirname+'/public'));
// post 미들웨어
app.use(cookieParser());    //쿠키 미들웨어 등록
app.use(expressSession({    //세션 미들웨어 등록
    secret:'my Pink',   // 세션 암호화
    resave:true,   
    saveUninitialized:true  
}));
app.use(bodyParser.urlencoded({extended : true}));

// 라우터 미들웨어 설정
const router = express.Router();

// index
router.get('/index', (req, res)=>{
    // 로그인 되어 있지 않다면
    if(!req.session.login_member){
        res.render('index');
    } else{ // 로그인 성공 후
        res.render('index');
    }
});



//  로그인 폼
router.get('/login', (req, res)=>{
    // 로그인 되어있다면....이슈1.(프로그램 상 해결해야 할 것이지만 아직 처리하지 못 한 것)
    if(!req.session.login_member){
        res.render('login');
    } else{
        res.redirect('/index');
    }
});

//  로그인 액션
router.post('/login',(req, res)=>{
    if(req.session.login_member){
        res.render('login');
    } else {
        const member_id = req.body.member_id;
        const member_pw = req.body.member_pw;
        /*
            SELECT member_id, member_name
            FROM member
            WHERE member_id=? and member_pw=?
        */

        conn.query('SELECT member_id, member_name FROM member WHERE member_id=? and member_pw=?', 
                    [member_id, member_pw],
                    (err, rs)=>{
                        if(rs.length == 0){
                            console.log('로그인 실패');
                            res.redirect('/login');
                        }else{
                            console.log('로그인 성공');
                            //  session에 저장
                            req.session.login_member = {
                                member_id:rs[0].member_id,
                                member_name:rs[0].member_name
                            };
                            console.log(req.session.login_member.member_name);
                            res.redirect('/boardList');
                        }
                    });
    }
});

//  로그아웃
router.get('/logout', (req, res)=>{
    req.session.destroy((err)=>{
        console.log('로그아웃 성공');
        res.redirect('/login');
    });
});


// 회원가입
// 회원가입 입력폼
router.get('/addMember',(req,res)=>{
    // 세션 검사
    if(req.session.login_member){
        res.redirect('/logout');
    } else {
        console.log('/addMember 입력폼 요청');
        res.render('addMember');
    }
    
}); 

// 회원가입 입력액션
router.post('/addMember',(req,res)=>{
    if(req.session.login_member){
        res.redirect('/login');
    } else {
        console.log('/addMember 입력액션 요청');
        const member_id = req.body.member_id;
        const member_pw = req.body.member_pw;
        const member_name = req.body.member_name;
       
        conn.query('INSERT INTO member(member_id, member_pw, member_name) VALUES(?, ?, ?)'
                ,[member_id , member_pw , member_name], (err, result)=>{
            if(err){
                console.log(err);
                res.end();
            }else{
                res.redirect('boardList');
            }
        });
    }   
});

// 회원탈퇴
// 회원탈퇴 요청 입력폼
router.get('/deleteMember',(req,res)=>{
    if(!req.session.login_member){
        res.redirect('/login');
    } else {
        console.log('/deleteMember 삭제 요청');
        const member_id = req.session.login_member.member_id;
        console.log(member_id);
        res.render('deleteMember',{deleteMember:member_id});
    }
});

// 회원탈퇴 요청 입력액션
router.post('/deleteMember',(req,res)=>{
    if(!req.session.login_member){
        res.redirect('/login');
    } else {
        console.log('/deleteMember 삭제 처리');
        const member_id = req.body.member_id;
        const member_pw = req.body.member_pw;
        conn.query('DELETE FROM member WHERE member_id =? AND member_pw=?'
                ,[member_id, member_pw],(err,rs)=>{
            if(err){
                console.log(err);
                res.end();
            }else{
                console.log('회원 삭제 성공');
                conn.query('INSERT INTO memberid(member_id, memberid_date) VALUES(?, now())', [member_id], (err, rs)=>{
                    console.log('삭제 후 삭제 정보 저장 성공');
                    res.redirect('/logout');
                });
            }
        });
    }   
});


// 입력 요청
// 입력폼
router.get('/addBoard',(req,res)=>{
    // 세션 검사
    if(!req.session.login_member){
        res.redirect('/login');
    } else {
        console.log('/addBoard 입력폼 요청');
        res.render('addBoard');
    }
    
});

// 입력액션
router.post('/addBoard'
        , myMulter.single('file')
        ,(req,res)=>{
    if(!req.session.login_member){ 
        res.redirect('/login');
    } else {
        console.log('/addBoard 입력액션 요청');
        
        
        const board_pw = req.body.board_pw;
        const board_title = req.body.board_title;
        const board_content = req.body.board_content;
        const board_user = req.session.login_member.member_id;
        const board_date = req.body.board_date;
        const boardFile = req.file;

        conn.query('INSERT INTO board(board_pw,board_title,board_content,board_user,board_date) VALUES(?,?,?,?,now())'
                ,[board_pw , board_title , board_content , board_user], (err, result)=>{
            if(err){
                console.log(err);
                res.end();
            }else{
                conn.query('SELECT MAX(board.board_no)board_no FROM board', (err, rs)=>{
                    if(err){
                        console.log(err);
                        res.end();
                    }else{
                        const boardNo = rs[0].board_no;  // SELECT MAX(pk)
                        const originalname = boardFile.originalname;
                        const di = originalname.lastIndexOf(".");
                        const boardfileExt = boardFile.originalname.substr(di+1);
                        const boardfileName = boardFile.filename;
                        const boardfileType = boardFile.mimetype;
                        const boardfileSize = boardFile.size;

                        console.log(boardfileName);
                        console.log(boardfileExt);
                        console.log(boardfileType);
                        console.log(boardfileSize);

                        conn.query('INSERT INTO boardfile(board_no, boardfile_name, boardfile_ext, boardfile_type, boardfile_size) VALUES(?, ?, ?, ?, ?)'
                                    , [boardNo, boardfileName, boardfileExt, boardfileType, boardfileSize]
                                    , (err, mb)=>{
                            if(err){
                                console.log(err);
                                res.end();
                            }else{
                                console.log('boardfile 입력성공');
                                res.redirect('boardList');
                            }    
                        });
                    }
                });
            }
        });
    }   
});

//리스트 겟으로 초기 요청
router.get('/boardList', (req,res)=>{
    console.log('/boardList 초기 요청');
    res.redirect('/boardList/1');
});

// 리스트 요청
router.get('/boardList/:currentPage',(req,res)=>{
    console.log('/boardList 요청');
    let rowPerPage = 10;    // 페이지당 보여줄 글목록 : 10개
    let currentPage = 1;    
    if(req.params.currentPage){    
        currentPage = parseInt(req.params.currentPage);  
    }
    let beginRow =(currentPage-1)*rowPerPage;   
    console.log(`currentPage : ${currentPage}`);
    let model = {};
    conn.query('SELECT COUNT(*) AS cnt FROM board',(err,result)=>{  //전체 글목록 행 갯수 구하기
        if(err){
            console.log(err);
            res.end();
        }else{
            console.log(`totalRow : ${result[0].cnt}`);
            let totalRow = result[0].cnt;
            lastPage = totalRow / rowPerPage;   
            if(totalRow % rowPerPage != 0){ 
                lastPage++;
            }
        }

        conn.query('SELECT board_no,board_title,board_user FROM board ORDER BY board_no DESC LIMIT ?,?'
                ,[beginRow,rowPerPage],(err,rs)=>{   
            if(err){   
                console.log(err);
                res.end();
            }else{
                model.boardList = rs;
                model.currentPage = currentPage;
                model.lastPage = lastPage;
                res.render('boardList',{model:model});
            }
        });
    });  
});

// 상세내용 보기
router.get('/boardDetail/:board_no',(req,res)=>{  
    if(!req.session.login_member){
        res.redirect('/login');
    } else {
        console.log('/boardDetail 요청');
        if(!req.params.board_no){
            res.redirect('boardList');
        }else{
            conn.query('SELECT board_no,board_title,board_content,board_user,board_date FROM board WHERE board_no=?'
                    ,[parseInt(req.params.board_no)],(err,rs)=>{
                if(err){
                    console.log(err);
                    res.end();
                }else{
                    res.render('boardDetail',{boardDetail:rs[0]});
                }
            });
        }
    }
});

// 삭제 요청
// 삭제폼(비밀번호 확인을 위한 )
router.get('/deleteBoard/:board_no',(req,res)=>{
    if(!req.session.login_member){
        res.redirect('/login');
    } else {
        console.log('/deleteBoard 삭제 요청');
        const board_no = parseInt(req.params.board_no);
        console.log(board_no);
        res.render('deleteBoard',{deleteBoard:board_no});
    }
});

// 삭제액션
router.post('/deleteBoard/:board_no',(req,res)=>{
    if(!req.session.login_member){
        res.redirect('/login');
    } else {
        console.log('/deleteBoard 삭제 처리');
        const board_no = req.body.board_no;
        const board_pw = req.body.board_pw;
        const member_id = req.session.login_member.member_id
        conn.query('DELETE FROM board WHERE board_no =? AND board_pw=? AND board_user=?'
                ,[board_no, board_pw, member_id],(err,rs)=>{
            if(err){
                console.log(err);
                res.end();
            }else{
                console.log('삭제 후 멤버id 기록 성공');
                res.redirect('/boardList');
            }
        });
    }   
});


// 수정 요청
// 수정폼
router.get('/updateBoard/:board_no',(req,res)=>{
    if(!req.session.login_member){
        res.redirect('/login');
    } else {
        console.log('/updateBoard 수정폼 요청');
        const board_no = parseInt(req.params.board_no);
        console.log(board_no);
        conn.query('SELECT board_no,board_pw,board_title,board_content,board_user FROM board WHERE board_no=?'
                ,[board_no],(err,rs)=>{
            if(err){
                console.log(err);
                res.end();
            }else{
                res.render('updateBoard',{updateBoard:rs[0]});
            }
        });
    }
});

// 수정액션
router.post('/updateBoard/:board_no',(req,res)=>{
    if(!req.session.login_member){
        res.redirect('/login');
    } else {
        console.log('/updateBoard 수정액션 요청');
        const board_no = req.body.board_no;
        const board_pw = req.body.board_pw;
        const board_title = req.body.board_title;
        const board_content = req.body.board_content;
        conn.query('UPDATE board SET board_title=?,board_content=? WHERE board_pw=? AND board_no=?'
                ,[board_title,board_content,board_pw,board_no],(err,rs)=>{
            if(err){
                console.log(err);
                res.end();
            }else{
                res.redirect('/boardList');
            }
        })
    } 
});



app.use('/',router);
// 미들웨어 설정 끝
// 80번포트 웹서버 실행
app.listen(80, function () {
    console.log('Example app listening on port 80!');
});