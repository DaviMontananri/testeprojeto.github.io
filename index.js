const express = require('express');
const cors = require('cors');
const ConexaoMysql = require('./ConexaoMysql');
const bodyParser = require('body-parser');
// bcrypt - ele esconde a senha para que quando esta senha for salva no mysql ele salve em hash
const bcrypt = require('bcrypt');
//O multer (Middleware) lida com upload de arquivos em servidor express
const multer = require('multer');
// o fs e um modulo que disponibiliza diversas funcionalidades uteis e ele ja e integrado com o node.js
const fs = require('fs');
// o path e um modulo que disponibiliza diversas funcionalidades uteis e ele ja e integrado com o node.js
const path = require('path');

// Caminho onde as imagens serão armazenadas
//Existe 3 caminhos  possíveis para armazenar as imagens
//__dirname - que obtem a pasta pai do aqrquivo
//__basename - obtem a parte do nome do arquivo
//__extname - que obtem a parte da esxtensao do arquivo
// E todos usam o path.join para concatenar as pastas
const uploadDir = path.join(__dirname, 'frontend', 'ImgUploads');

// Verifica se o diretório existe e, se não, cria usando o fs.existisSync
// se nao estiver ele vai criar o diretorio fs.mkdirSync
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());
app.use(bodyParser.json());



//Criando a rota (API) para selecionar todos os cadastros feito pelos coordenadores
app.get('/', (req, res) => {
    const q = 'SELECT id_coordenador, nome_coordenador, cpf_coordenador, telefone_coordenador, email_coordenador, senha_coordenador FROM cadastro_coordenadores ';


    ConexaoMysql.query(q, (err, data) => {
        if (err) {
            return res.json(err);
        }

        return res.status(200).json(data);
    });
});

// Rota para buscar dados da tabela registro_professores
app.get('/coordenadores', (req, res) => {

    const query = 'SELECT * FROM registros_professores';

    ConexaoMysql.query(query, (err, data) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        return res.status(200).json(data);
    });
});

//Rota para buscar os pedidos finalizado pela manutencao
app.get('/pedidosAtualizados', (req, res) => {
    const pedidosQuery = 'SELECT * FROM registro_atualizado';

    ConexaoMysql.query(pedidosQuery, (err, data) => {
        if (err) {
            return res.status(200).json(data);
        }
        return res.status(200).json(data);
    })
})

app.get('/img/:id', (req, res) => {
    const id = req.params.id;
    console.log(`Buscando imagem com ID: ${id}`); // Log do ID
    const query = 'SELECT imagem_registroprof FROM registros_professores WHERE id_registrosprof = ?';
    ConexaoMysql.query(query, [id], (err, results) => {
        if (err) {
            console.error('Erro na consulta:', err); // Log do erro
            return res.status(500).json({ error: err.message });
        }

        if (results.length === 0) {
            return res.status(404).send('Imagem não encontrada');
        }

        const imagem = results[0].imagem_registroprof;
        res.set('Content-Type', 'image/png'); // ou 'image/png', dependendo do formato
        res.send(imagem);
    });
});

//Rota para pegar a imagem e mostrar no frontend
app.get('/imgPedido/:id', (req, res) => {
    const id = req.params.id;

    const query = 'SELECT imagem_atualizada FROM registro_atualizado WHERE id_atualizado = ?';
    ConexaoMysql.query(query, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (results.length === 0) {
            return res.status(404).send('Imagem não encontrada');
        }

        const imagem = results[0].imagem_atualizada;
        res.set('Content-Type', 'image/png'); // ou 'image/png', dependendo do formato
        res.send(imagem);
    });
});

// Rota para deletar um professor
app.delete('/Delprofessores/:id', (req, res) => {
    const id = req.params.id;
    console.log(`ID recebido no backend: ${id}`); // Adicione este log
    const query = 'DELETE FROM registros_professores WHERE id_registrosprof = ?';

    ConexaoMysql.query(query, [id], (err, result) => {
        if (err) {
            console.error('Erro no banco de dados:', err); // Adicione este log
            return res.status(500).json({ error: err.message });
        }
        return res.status(200).json({ message: 'Professor deletado com sucesso' });
    });
});

// Rota para deletar pedidos concluido
app.delete('/deletePedidos/:id', (req, res) => {
    const id = req.params.id;
    console.log(`ID recebido no backend: ${id}`); // Adicione este log
    const query = 'DELETE FROM registro_atualizado WHERE id_atualizado = ?';

    ConexaoMysql.query(query, [id], (err, result) => {
        if (err) {
            console.error('Erro no banco de dados:', err); // Adicione este log
            return res.status(500).json({ error: err.message });
        }
        return res.status(200).json({ message: 'Pedido deletado com sucesso' });
    });
});

//Aqui ele vai adicionar os cadastro dos coordenadores
app.post('/addCoordenador', async (req, res) => {
    const { nomeCoord, cpfCoord, telefoneCoord, emailCoord, senhaCoord } = req.body;

    // Verificar se o email ou CPF já estão cadastrados
    const checkQuery = 'SELECT * FROM cadastro_coordenadores WHERE email_coordenador = ? OR cpf_coordenador = ?';

    ConexaoMysql.query(checkQuery, [emailCoord, cpfCoord], async (err, results) => {
        if (err) {
            console.error('Erro ao verificar coordenadores: ', err);
            return res.status(500).json({ message: 'Erro ao verificar coordenadores.' });
        }

        if (results.length > 0) {
            return res.status(400).json({ message: 'Já existe um coordenador cadastrado com este e-mail ou CPF.' });
        }

        // Hash da senha criptografada
        const hashedPassword = await bcrypt.hash(senhaCoord, 10);
        const insertQuery = 'INSERT INTO cadastro_coordenadores (nome_coordenador, cpf_coordenador, telefone_coordenador, email_coordenador, senha_coordenador) VALUES (?, ?, ?, ?, ?)';

        ConexaoMysql.query(insertQuery, [nomeCoord, cpfCoord, telefoneCoord, emailCoord, hashedPassword], (err, data) => {
            if (err) {
                console.error('Erro ao cadastrar coordenadores: ', err);
                return res.status(500).json(err);
            }

            return res.status(200).json({ message: 'Usuário cadastrado com sucesso.' });
        });
    });
});



// Rota para validação de Login
app.post('/validacao-login', (req, res) => {
    const { emailLogin, senhaLogin } = req.body;
    const q = 'SELECT * FROM cadastro_coordenadores WHERE email_coordenador = ?';

    ConexaoMysql.execute(q, [emailLogin], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        if (results.length > 0) {
            // o bcrypt.compare - o compare recebe o primeiro valor da senha nao criptografada
            const user = results[0];
            const match = await bcrypt.compare(senhaLogin, user.senha_coordenador);
            if (match) {
                 return res.status(200).json({ valid: true, nome: user.nome_coordenador });
            } else {
                return res.status(200).json({ valid: false });
            }
        } else {
            return res.status(200).json({ valid: false });
        }
    });
});


// Rota para redefinir a senha
app.post('/resetSenha', async (req, res) => {
    const { emailCoord, senhaCoord } = req.body;

    if (!emailCoord || !senhaCoord) {
        return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }

    try {
        // Verifica se o usuário existe
        ConexaoMysql.query('SELECT * FROM cadastro_coordenadores WHERE email_coordenador = ?', [emailCoord], async (err, results) => {
            if (err) return res.status(500).json({ message: 'Erro ao consultar usuário.' });
            if (results.length === 0) return res.status(404).json({ message: 'Usuário não encontrado.' });

            // Hash da nova senha
            // bcrypt - ele esconde a senha para que aundo ela salvar no banco de dados criptografa a senha
            const hashedPassword = await bcrypt.hash(senhaCoord, 10);

            // Atualiza a senha no banco de dados
            ConexaoMysql.query('UPDATE cadastro_coordenadores SET senha_coordenador = ? WHERE email_coordenador = ?', [hashedPassword, emailCoord], (err) => {
                if (err) return res.status(500).json({ message: 'Erro ao atualizar senha.' });
                return res.status(200).json({ message: 'Senha redefinida com sucesso!' });
            });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ocorreu um erro ao redefinir a senha.' });
    }
});

//Configuracao do multer
//O multer (Middleware) lida com upload de arquivos em servidor express

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); //  Pasta onde imagens serao armazenadas
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname); // Mantem o nome original do arquivo
    }
});

const upload = multer({ storage: storage });

//Adicionar a rota para receber as imagens e a descricao
app.post('/dadosAtualizados', upload.array('imagens'), (req, res) => {
    const imagens = req.files; // Array de arquivos enviados
    const descricao = req.body.descricao;

    // AIterar sobre as imagens e inserir no banco de dados
    imagens.forEach(imagem => {
        const q = 'INSERT INTO registro_atualizado (imagem_atualizada, descricao_atualizada) VALUES (?, ?)';
        ConexaoMysql.query(q, [descricao, imagem.filename], (err, result) => {
            if (err) {
                console.error('Erro ao inserir dados:', err);
                return res.status(500).json({ message: 'Erro ao salvar dados.' });
            }
        });
    });

    res.status(200).json({ message: 'Dados recebidos com sucesso' })

});



app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
})
