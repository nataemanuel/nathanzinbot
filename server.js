require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const multer = require("multer");
const pdfParse = require("pdf-parse");

const { GoogleGenAI } = require("@google/genai");

const Message = require("./models/Message");
const User = require("./models/User");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();


// ==========================================
// CONFIGURAÇÕES
// ==========================================

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({
  extended: true
}));

app.use(express.static(
  path.join(__dirname, "public")
));


// ==========================================
// UPLOAD DE DOCUMENTOS
// ==========================================

const upload = multer({

  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {

    const tiposPermitidos = [
      "application/pdf",
      "text/plain"
    ];

    if (tiposPermitidos.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Apenas arquivos PDF ou TXT são permitidos."));
    }

  }

});


// ==========================================
// GEMINI
// ==========================================

const ai = new GoogleGenAI({

  apiKey: process.env.GEMINI_API_KEY

});


// ==========================================
// CONEXÃO COM MONGODB
// ==========================================

mongoose.connect(process.env.MONGODB_URI)

  .then(() => {
    console.log("MongoDB conectado");
  })

  .catch((error) => {
    console.log("Erro MongoDB:", error);
  });


// ==========================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ==========================================

function autenticarToken(req, res, next) {

  const authHeader = req.headers.authorization;


  if (!authHeader) {

    return res.status(401).json({
      error: "Acesso negado. Faça login."
    });

  }


  const partes = authHeader.split(" ");


  if (
    partes.length !== 2 ||
    partes[0] !== "Bearer"
  ) {

    return res.status(401).json({
      error: "Token inválido."
    });

  }


  const token = partes[1];


  try {

    const usuario = jwt.verify(
      token,
      process.env.JWT_SECRET
    );


    req.user = usuario;


    next();


  } catch (error) {

    return res.status(401).json({
      error: "Token expirado ou inválido."
    });

  }

}


// ==========================================
// CADASTRO
// ==========================================

app.post("/cadastro", async (req, res) => {

  try {

    const {
      name,
      email,
      password
    } = req.body;


    if (!name || !email || !password) {

      return res.status(400).json({
        error: "Preencha todos os campos."
      });

    }


    if (password.length < 6) {

      return res.status(400).json({
        error: "A senha deve ter pelo menos 6 caracteres."
      });

    }


    const emailNormalizado = email
      .trim()
      .toLowerCase();


    const usuarioExistente =
      await User.findOne({
        email: emailNormalizado
      });


    if (usuarioExistente) {

      return res.status(400).json({
        error: "Este e-mail já está cadastrado."
      });

    }


    const senhaCriptografada =
      await bcrypt.hash(
        password,
        10
      );


    const usuario =
      await User.create({

        name: name.trim(),

        email: emailNormalizado,

        password: senhaCriptografada

      });


    res.status(201).json({

      message: "Usuário criado com sucesso!",

      user: {

        id: usuario._id,

        name: usuario.name,

        email: usuario.email

      }

    });


  } catch (error) {

    console.error(
      "Erro no cadastro:",
      error
    );


    res.status(500).json({

      error: "Erro ao criar usuário."

    });

  }

});


// ==========================================
// LOGIN
// ==========================================

app.post("/login", async (req, res) => {

  try {

    const {
      email,
      password
    } = req.body;


    if (!email || !password) {

      return res.status(400).json({
        error: "Informe e-mail e senha."
      });

    }


    const emailNormalizado = email
      .trim()
      .toLowerCase();


    const usuario =
      await User.findOne({
        email: emailNormalizado
      });


    if (!usuario) {

      return res.status(401).json({
        error: "E-mail ou senha incorretos."
      });

    }


    const senhaCorreta =
      await bcrypt.compare(
        password,
        usuario.password
      );


    if (!senhaCorreta) {

      return res.status(401).json({
        error: "E-mail ou senha incorretos."
      });

    }


    const token = jwt.sign(

      {
        id: usuario._id.toString(),

        email: usuario.email
      },

      process.env.JWT_SECRET,

      {
        expiresIn: "7d"
      }

    );


    res.json({

      message:
        "Login realizado com sucesso!",

      token,

      user: {

        id: usuario._id,

        name: usuario.name,

        email: usuario.email

      }

    });


  } catch (error) {

    console.error(
      "Erro no login:",
      error
    );


    res.status(500).json({

      error:
        "Erro ao realizar login."

    });

  }

});


// ==========================================
// CHAT NORMAL
// ==========================================

app.post(
  "/chat",
  autenticarToken,
  async (req, res) => {

    try {

      const {
        message,
        sessionId
      } = req.body;


      if (!message || !sessionId) {

        return res.status(400).json({

          error:
            "Mensagem ou sessão inválida."

        });

      }


      const userId = req.user.id;


      // --------------------------------------
      // SALVA MENSAGEM DO USUÁRIO
      // --------------------------------------

      await Message.create({

        userId,

        sessionId,

        role: "user",

        text: message

      });


      // --------------------------------------
      // BUSCA HISTÓRICO
      // --------------------------------------

      const history =
        await Message.find({

          userId,

          sessionId

        }).sort({

          createdAt: 1

        });


      // --------------------------------------
      // CONVERTE PARA FORMATO DO GEMINI
      // --------------------------------------

      const contents =
        history.map(msg => ({

          role:
            msg.role === "user"
              ? "user"
              : "model",

          parts: [

            {
              text: msg.text
            }

          ]

        }));


      // --------------------------------------
      // GEMINI
      // --------------------------------------

      const response =
        await ai.models.generateContent({

          model: "gemini-flash-lite-latest",

          contents

        });


      const botReply =
        response.text;


      // --------------------------------------
      // SALVA RESPOSTA DO BOT
      // --------------------------------------

      await Message.create({

        userId,

        sessionId,

        role: "assistant",

        text: botReply

      });


      res.json({

        reply: botReply

      });


    } catch (error) {

      console.error(
        "Erro no chat:",
        error
      );


      res.status(500).json({

        error:
          "Erro ao gerar resposta."

      });

    }

  }
);


// ==========================================
// CHAT COM PDF / TXT
// ==========================================

app.post(
  "/api/perguntar-documento",
  autenticarToken,
  upload.single("documento"),

  async (req, res) => {

    try {

      // --------------------------------------
      // VERIFICA ARQUIVO
      // --------------------------------------

      if (!req.file) {

        return res.status(400).json({

          erro:
            "Nenhum documento foi enviado."

        });

      }


      // --------------------------------------
      // VERIFICA PERGUNTA
      // --------------------------------------

      const pergunta =
        req.body.pergunta;


      if (
        !pergunta ||
        !pergunta.trim()
      ) {

        return res.status(400).json({

          erro:
            "Digite uma pergunta."

        });

      }


      // --------------------------------------
      // EXTRAI TEXTO
      // --------------------------------------

      let textoDocumento = "";


      // PDF
      if (
        req.file.mimetype ===
        "application/pdf"
      ) {

        const resultado =
          await pdfParse(
            req.file.buffer
          );


        textoDocumento =
          resultado.text;

      }


      // TXT
      else if (
        req.file.mimetype ===
        "text/plain"
      ) {

        textoDocumento =
          req.file.buffer.toString(
            "utf-8"
          );

      }


      // OUTRO ARQUIVO
      else {

        return res.status(400).json({

          erro:
            "Envie apenas arquivos PDF ou TXT."

        });

      }


      // --------------------------------------
      // VERIFICA SE EXISTE TEXTO
      // --------------------------------------

      if (
        !textoDocumento ||
        !textoDocumento.trim()
      ) {

        return res.status(400).json({

          erro:
            "Não foi possível encontrar texto no documento."

        });

      }


      // --------------------------------------
      // PROMPT DO GEMINI
      // --------------------------------------

      const prompt = `

Você é um analista.

REGRA ABSOLUTA:

Responda à pergunta do usuário ÚNICA E EXCLUSIVAMENTE
com base no conteúdo do documento fornecido.

Não use conhecimentos externos.

Não invente informações.

Não faça suposições.

Não complete informações que não estejam presentes
no documento.

Se a resposta não estiver no documento, responda:

"Essa informação não está presente no documento."

DOCUMENTO:
========================================

${textoDocumento}

========================================

PERGUNTA DO USUÁRIO:

${pergunta}

`;


      // --------------------------------------
      // ENVIA PARA O GEMINI
      // --------------------------------------

      const response =
        await ai.models.generateContent({

          model: "gemini-2.5-flash",

          contents: prompt

        });


      const resposta =
        response.text;


      // --------------------------------------
      // RETORNA RESPOSTA
      // --------------------------------------

      res.json({

        resposta: resposta

      });


    } catch (error) {

  console.error("=================================");
  console.error("ERRO AO PROCESSAR DOCUMENTO");
  console.error("=================================");
  console.error("Nome:", error.name);
  console.error("Mensagem:", error.message);
  console.error("Stack:", error.stack);

  res.status(500).json({

    erro: "Erro ao processar o documento.",
    detalhe: error.message

  });

}

  }
);


// ==========================================
// HISTÓRICO DE UMA CONVERSA
// ==========================================

app.get(
  "/historico/:sessionId",
  autenticarToken,

  async (req, res) => {

    try {

      const {
        sessionId
      } = req.params;


      const userId =
        req.user.id;


      const historico =
        await Message.find({

          userId,

          sessionId

        }).sort({

          createdAt: 1

        });


      res.json(
        historico
      );


    } catch (error) {

      console.error(error);


      res.status(500).json({

        error:
          "Erro ao buscar histórico."

      });

    }

  }
);


// ==========================================
// APAGAR CONVERSA
// ==========================================

app.delete(
  "/historico/:sessionId",
  autenticarToken,

  async (req, res) => {

    try {

      const {
        sessionId
      } = req.params;


      const userId =
        req.user.id;


      await Message.deleteMany({

        userId,

        sessionId

      });


      res.json({

        message:
          "Histórico apagado com sucesso!"

      });


    } catch (error) {

      console.error(error);


      res.status(500).json({

        error:
          "Erro ao apagar histórico."

      });

    }

  }
);


// ==========================================
// LISTAR CONVERSAS DO USUÁRIO
// ==========================================

app.get(
  "/historico/lista/sessoes",
  autenticarToken,

  async (req, res) => {

    try {

      const userId =
        req.user.id;


      const sessoes =
        await Message.aggregate([

          {
            $match: {

              userId:
                new mongoose.Types.ObjectId(
                  userId
                )

            }

          },

          {

            $sort: {

              createdAt: 1

            }

          },

          {

            $group: {

              _id: "$sessionId",

              titulo: {

                $first: "$text"

              },

              dataCriacao: {

                $first: "$createdAt"

              }

            }

          },

          {

            $sort: {

              dataCriacao: -1

            }

          }

        ]);


      res.json(
        sessoes
      );


    } catch (error) {

      console.error(error);


      res.status(500).json({

        error:
          "Erro ao listar sessões de chat."

      });

    }

  }
);


// ==========================================
// TRATAMENTO DE ERRO DO UPLOAD
// ==========================================

app.use(
  (error, req, res, next) => {

    if (
      error instanceof multer.MulterError
    ) {

      if (
        error.code ===
        "LIMIT_FILE_SIZE"
      ) {

        return res.status(400).json({

          erro:
            "O arquivo é muito grande. O limite é 10 MB."

        });

      }

    }


    if (
      error &&
      error.message ===
      "Apenas arquivos PDF ou TXT são permitidos."
    ) {

      return res.status(400).json({

        erro:
          "Apenas arquivos PDF ou TXT são permitidos."

      });

    }


    console.error(error);


    res.status(500).json({

      erro:
        "Erro interno do servidor."

    });

  }
);


// ==========================================
// SERVIDOR
// ==========================================

const PORT =
  process.env.PORT || 3000;


app.listen(
  PORT,

  () => {

    console.log(
      `Servidor rodando na porta ${PORT}`
    );

  }
);