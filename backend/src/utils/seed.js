require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Usuario = require('../models/Usuario');
const Prova = require('../models/Prova');
const Versao = require('../models/Versao');
const Atividade = require('../models/Atividade');

async function seed() {
  try {
    console.log('🌱 Conectando ao MongoDB para semear banco de dados...');
    await connectDB();

    console.log('🧹 Limpando dados anteriores de teste...');
    await Promise.all([
      Usuario.deleteMany({}),
      Prova.deleteMany({}),
      Versao.deleteMany({}),
      Atividade.deleteMany({}),
    ]);

    console.log('👤 Criando usuários para cada perfil do sistema...');
    const usuariosCriados = await Usuario.create([
      {
        nome: 'Administrador do Sistema',
        email: 'admin@colegio.edu.br',
        senha: 'admin123',
        perfil: 'admin',
        disciplinaPadrao: 'Gestão Escolar',
        ativo: true,
      },
      {
        nome: 'Juliana Mendes (Setor de Provas)',
        email: 'setor@colegio.edu.br',
        senha: 'setor123',
        perfil: 'setor_provas',
        disciplinaPadrao: 'Setor de Provas',
        ativo: true,
      },
      {
        nome: 'Prof. Roberto Alcantara (Aprovador Final)',
        email: 'aprovador@colegio.edu.br',
        senha: 'aprovador123',
        perfil: 'responsavel_aprovacao',
        disciplinaPadrao: 'Direção Pedagógica',
        ativo: true,
      },
      {
        nome: 'Mariana Duarte (Coordenação)',
        email: 'coordenacao@colegio.edu.br',
        senha: 'coordenacao123',
        perfil: 'coordenacao',
        disciplinaPadrao: 'Coordenação Geral',
        ativo: true,
      },
      {
        nome: 'Prof. Carlos Silva',
        email: 'carlos.silva@colegio.edu.br',
        senha: 'prof123',
        perfil: 'professor',
        disciplinaPadrao: 'Matemática',
        ativo: true,
      },
      {
        nome: 'Profa. Ana Souza',
        email: 'ana.souza@colegio.edu.br',
        senha: 'prof123',
        perfil: 'professor',
        disciplinaPadrao: 'História',
        ativo: true,
      },
    ]);

    const admin = usuariosCriados[0];
    const setor = usuariosCriados[1];
    const aprovador = usuariosCriados[2];
    const coordenacao = usuariosCriados[3];
    const profCarlos = usuariosCriados[4];
    const profAna = usuariosCriados[5];

    console.log('📝 Criando provas e histórico de versões demonstrativas...');

    // 1. Prova 1: Carlos Silva - Matemática 9º Ano A - AG - 1º Trimestre - Aprovada para impressão
    const prova1 = await Prova.create({
      codigo: 'PRV-2026-0001',
      titulo: 'Avaliação Geral de Álgebra e Equações',
      professorId: profCarlos._id,
      disciplina: 'Matemática',
      turma: '9º Ano A',
      trimestre: '1º',
      divisao: 'AG',
      dataAplicacao: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // daqui a 5 dias
      prazoEntrega: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // entregue no prazo
      status: 'APROVADA_PARA_IMPRESSAO',
      versaoAtualNumero: 2,
      liberadaParaImpressao: true,
      conferidoPor: setor._id,
      responsavelUltimaAlteracao: aprovador._id,
      observacoes: 'Formatação ajustada para 4 páginas. Gabarito na última folha.',
    });

    const v1Prova1 = await Versao.create({
      provaId: prova1._id,
      numero: 1,
      arquivo: {
        url: 'https://raw.githubusercontent.com/mozilla/pdf.js/master/examples/helloworld/helloworld.pdf',
        nomeOriginal: 'Matematica_9Ano_AG_V1.pdf',
        tamanhoBytes: 345000,
        mimetype: 'application/pdf',
        storageKey: 'Matematica_9Ano_AG_V1.pdf',
      },
      enviadoPor: profCarlos._id,
      descricaoAlteracoes: 'Versão original enviada pelo professor.',
      statusValidacaoProfessor: 'APROVADO',
      statusAprovacaoFinal: 'PENDENTE',
      liberadaImpressao: false,
    });

    const v2Prova1 = await Versao.create({
      provaId: prova1._id,
      numero: 2,
      arquivo: {
        url: 'https://raw.githubusercontent.com/mozilla/pdf.js/master/examples/helloworld/helloworld.pdf',
        nomeOriginal: 'Matematica_9Ano_AG_V2_Corrigida.pdf',
        tamanhoBytes: 360000,
        mimetype: 'application/pdf',
        storageKey: 'Matematica_9Ano_AG_V2_Corrigida.pdf',
      },
      enviadoPor: setor._id,
      descricaoAlteracoes: 'Ajuste de margens, inclusão do cabeçalho oficial e correção na numeração da questão 7.',
      observacoesSetor: 'Diagramação concluída com sucesso.',
      houveAlteracaoConteudo: true,
      statusValidacaoProfessor: 'APROVADO',
      parecerProfessor: 'Conferido e validado. Pode imprimir.',
      dataValidacaoProfessor: new Date(Date.now() - 24 * 60 * 60 * 1000),
      statusAprovacaoFinal: 'APROVADA',
      aprovadoPor: aprovador._id,
      dataAprovacaoFinal: new Date(Date.now() - 12 * 60 * 60 * 1000),
      justificativaAprovacao: 'Conforme todas as etapas pedagógicas e revisão do setor.',
      liberadaImpressao: true,
    });

    prova1.versaoAtualId = v2Prova1._id;
    prova1.versaoAprovadaId = v2Prova1._id;
    await prova1.save();

    // 2. Prova 2: Ana Souza - História 3ª Série EM - AD - 1º Trimestre - Aguardando Validação do Professor
    const prova2 = await Prova.create({
      codigo: 'PRV-2026-0002',
      titulo: 'Avaliação Diversificada - Era Vargas e Segunda Guerra',
      professorId: profAna._id,
      disciplina: 'História',
      turma: '3ª Série EM',
      trimestre: '1º',
      divisao: 'AD',
      dataAplicacao: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
      prazoEntrega: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      status: 'AGUARDANDO_VALIDACAO_PROFESSOR',
      versaoAtualNumero: 2,
      liberadaParaImpressao: false,
      conferidoPor: setor._id,
      responsavelUltimaAlteracao: setor._id,
      observacoes: 'Substituído mapa da questão 4 por imagem de maior resolução.',
    });

    const v1Prova2 = await Versao.create({
      provaId: prova2._id,
      numero: 1,
      arquivo: {
        url: 'https://raw.githubusercontent.com/mozilla/pdf.js/master/examples/helloworld/helloworld.pdf',
        nomeOriginal: 'Historia_3EM_AD_V1.pdf',
        tamanhoBytes: 520000,
        mimetype: 'application/pdf',
        storageKey: 'Historia_3EM_AD_V1.pdf',
      },
      enviadoPor: profAna._id,
      descricaoAlteracoes: 'Versão inicial enviada pela professora.',
      statusValidacaoProfessor: 'APROVADO',
      statusAprovacaoFinal: 'PENDENTE',
      liberadaImpressao: false,
    });

    const v2Prova2 = await Versao.create({
      provaId: prova2._id,
      numero: 2,
      arquivo: {
        url: 'https://raw.githubusercontent.com/mozilla/pdf.js/master/examples/helloworld/helloworld.pdf',
        nomeOriginal: 'Historia_3EM_AD_V2_Revisada.pdf',
        tamanhoBytes: 550000,
        mimetype: 'application/pdf',
        storageKey: 'Historia_3EM_AD_V2_Revisada.pdf',
      },
      enviadoPor: setor._id,
      descricaoAlteracoes: 'Substituição do mapa histórico da questão 4 para melhor legibilidade na fotocópia.',
      observacoesSetor: 'Aguardando validação da professora Ana sobre a imagem.',
      houveAlteracaoConteudo: true,
      statusValidacaoProfessor: 'PENDENTE',
      statusAprovacaoFinal: 'PENDENTE',
      liberadaImpressao: false,
    });

    prova2.versaoAtualId = v2Prova2._id;
    await prova2.save();

    // 3. Prova 3: Carlos Silva - Matemática 1ª Série EM - AG - 2º Trimestre - Aguardando Conferência
    const prova3 = await Prova.create({
      codigo: 'PRV-2026-0003',
      titulo: 'Avaliação Geral - Funções Quadráticas e Trigonometria',
      professorId: profCarlos._id,
      disciplina: 'Matemática',
      turma: '1ª Série EM',
      trimestre: '2º',
      divisao: 'AG',
      dataAplicacao: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      prazoEntrega: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      status: 'AGUARDANDO_CONFERENCIA',
      versaoAtualNumero: 1,
      liberadaParaImpressao: false,
      responsavelUltimaAlteracao: profCarlos._id,
      observacoes: 'Prova contém formulário no anexo.',
    });

    const v1Prova3 = await Versao.create({
      provaId: prova3._id,
      numero: 1,
      arquivo: {
        url: 'https://raw.githubusercontent.com/mozilla/pdf.js/master/examples/helloworld/helloworld.pdf',
        nomeOriginal: 'Matematica_1EM_Funcoes_V1.pdf',
        tamanhoBytes: 410000,
        mimetype: 'application/pdf',
        storageKey: 'Matematica_1EM_Funcoes_V1.pdf',
      },
      enviadoPor: profCarlos._id,
      descricaoAlteracoes: 'Versão inicial enviada pelo professor.',
      statusValidacaoProfessor: 'APROVADO',
      statusAprovacaoFinal: 'PENDENTE',
      liberadaImpressao: false,
    });

    prova3.versaoAtualId = v1Prova3._id;
    await prova3.save();

    // 4. Prova 4: Ana Souza - História 8º Ano B - AG - 2º Trimestre - Aguardando Aprovação Final
    const prova4 = await Prova.create({
      codigo: 'PRV-2026-0004',
      titulo: 'Avaliação Geral - Revolução Francesa e Iluminismo',
      professorId: profAna._id,
      disciplina: 'História',
      turma: '8º Ano B',
      trimestre: '2º',
      divisao: 'AG',
      dataAplicacao: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      prazoEntrega: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      status: 'AGUARDANDO_APROVACAO_FINAL',
      versaoAtualNumero: 1,
      liberadaParaImpressao: false,
      conferidoPor: setor._id,
      responsavelUltimaAlteracao: setor._id,
      observacoes: 'Conferência realizada sem necessidade de alteração de conteúdo.',
    });

    const v1Prova4 = await Versao.create({
      provaId: prova4._id,
      numero: 1,
      arquivo: {
        url: 'https://raw.githubusercontent.com/mozilla/pdf.js/master/examples/helloworld/helloworld.pdf',
        nomeOriginal: 'Historia_8Ano_RevFrancesa_V1.pdf',
        tamanhoBytes: 290000,
        mimetype: 'application/pdf',
        storageKey: 'Historia_8Ano_RevFrancesa_V1.pdf',
      },
      enviadoPor: profAna._id,
      descricaoAlteracoes: 'Versão inicial conferida e aprovada sem alterações.',
      statusValidacaoProfessor: 'APROVADO',
      statusAprovacaoFinal: 'PENDENTE',
      liberadaImpressao: false,
    });

    prova4.versaoAtualId = v1Prova4._id;
    await prova4.save();

    // 5. Prova 5: Prova Atrasada para teste dos filtros
    const prova5 = await Prova.create({
      codigo: 'PRV-2026-0005',
      titulo: 'Avaliação Diversificada - Geometria Espacial',
      professorId: profCarlos._id,
      disciplina: 'Matemática',
      turma: '2ª Série EM',
      trimestre: '3º',
      divisao: 'AD',
      dataAplicacao: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      prazoEntrega: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Venceu há 3 dias!
      status: 'AGUARDANDO_CORRECAO',
      versaoAtualNumero: 1,
      liberadaParaImpressao: false,
      conferidoPor: setor._id,
      responsavelUltimaAlteracao: setor._id,
      observacoes: 'Professor precisa revisar o enunciado da questão 5 que está com dados faltantes.',
    });

    const v1Prova5 = await Versao.create({
      provaId: prova5._id,
      numero: 1,
      arquivo: {
        url: 'https://raw.githubusercontent.com/mozilla/pdf.js/master/examples/helloworld/helloworld.pdf',
        nomeOriginal: 'Matematica_2EM_Geometria_V1.pdf',
        tamanhoBytes: 310000,
        mimetype: 'application/pdf',
        storageKey: 'Matematica_2EM_Geometria_V1.pdf',
      },
      enviadoPor: profCarlos._id,
      descricaoAlteracoes: 'Versão inicial com pendência de revisão.',
      statusValidacaoProfessor: 'PENDENTE',
      statusAprovacaoFinal: 'PENDENTE',
      liberadaImpressao: false,
    });

    prova5.versaoAtualId = v1Prova5._id;
    await prova5.save();

    // Atividades de Auditoria
    await Atividade.create([
      {
        usuarioId: admin._id,
        acao: 'SISTEMA_INICIALIZADO',
        descricao: 'Base de dados inicializada com perfis e provas de teste.',
        dataHora: new Date(Date.now() - 72 * 60 * 60 * 1000),
      },
      {
        usuarioId: profCarlos._id,
        acao: 'CRIACAO_PROVA',
        descricao: 'Prova PRV-2026-0001 (Álgebra) cadastrada pelo professor.',
        provaId: prova1._id,
        versaoId: v1Prova1._id,
        dataHora: new Date(Date.now() - 48 * 60 * 60 * 1000),
      },
      {
        usuarioId: setor._id,
        acao: 'NOVA_VERSAO',
        descricao: 'Versão V2 enviada com correções de formatação e cabeçalho.',
        provaId: prova1._id,
        versaoId: v2Prova1._id,
        dataHora: new Date(Date.now() - 30 * 60 * 60 * 1000),
      },
      {
        usuarioId: profCarlos._id,
        acao: 'VALIDACAO_PROFESSOR',
        descricao: 'Professor validou o conteúdo da versão V2.',
        provaId: prova1._id,
        versaoId: v2Prova1._id,
        dataHora: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
      {
        usuarioId: aprovador._id,
        acao: 'APROVACAO_FINAL',
        descricao: 'Aprovação final concedida. Prova liberada exclusivamente para impressão.',
        provaId: prova1._id,
        versaoId: v2Prova1._id,
        dataHora: new Date(Date.now() - 12 * 60 * 60 * 1000),
      },
    ]);

    console.log('✅ Seed executado com sucesso!');
    console.log('\n--- CREDENCIAIS DE ACESSO PARA TESTES ---');
    console.log('1. Administrador: admin@colegio.edu.br / admin123');
    console.log('2. Setor de Provas: setor@colegio.edu.br / setor123');
    console.log('3. Resp. Aprovação: aprovador@colegio.edu.br / aprovador123');
    console.log('4. Coordenação: coordenacao@colegio.edu.br / coordenacao123');
    console.log('5. Professor (Carlos): carlos.silva@colegio.edu.br / prof123');
    console.log('6. Profa. (Ana): ana.souza@colegio.edu.br / prof123');
    console.log('----------------------------------------\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro durante o seed:', error);
    process.exit(1);
  }
}

seed();
