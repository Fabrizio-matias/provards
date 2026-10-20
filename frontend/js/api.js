/**
 * SISTEMA DE GERENCIAMENTO DO SETOR DE PROVAS - CLIENTE API
 * Configuração centralizada para requisições HTTP, autenticação e utilitários de UI
 */

// Permite alternar entre ambiente local e produção via localStorage ou fallback inteligente
function getApiBaseUrl() {
  const customUrl = localStorage.getItem('PROVAS_API_URL');
  if (customUrl) return customUrl;

  // Se o frontend estiver sendo servido pelo próprio backend (mesma origem)
  if (window.location.port === '5000' || window.location.hostname.includes('vercel.app')) {
    return `${window.location.origin}/api`;
  }

  // Padrão de desenvolvimento local
  return 'http://localhost:5000/api';
}

const API_BASE_URL = getApiBaseUrl();

/**
 * Cliente HTTP unificado com envio automático de token JWT e tratamento de erros
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const token = localStorage.getItem('provas_token');

  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Se o body não for FormData, define Content-Type como application/json
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Se a sessão expirou ou não for autorizada
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      localStorage.removeItem('provas_token');
      localStorage.removeItem('provas_user');
      window.location.href = 'login.html';
      throw new Error('Sessão expirada. Faça login novamente.');
    }

    // Se a resposta for um arquivo de download binário ou redirecionamento
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('application/json')) {
      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.statusText}`);
      }
      return response;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.mensagem || 'Ocorreu um erro no processamento da solicitação.');
    }

    return data;
  } catch (error) {
    console.error(`Erro na chamada API (${endpoint}):`, error);
    throw error;
  }
}

/**
 * Exibe notificações toast com micro-animação
 */
function showToast(mensagem, tipo = 'info', duracao = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;

  let icone = 'ℹ️';
  if (tipo === 'success') icone = '✅';
  if (tipo === 'error') icone = '❌';
  if (tipo === 'warning') icone = '⚠️';

  toast.innerHTML = `<span>${icone}</span><div>${mensagem}</div>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duracao);
}

/**
 * Formata data no padrão brasileiro
 */
function formatarData(dataIso, comHora = false) {
  if (!dataIso) return '-';
  const data = new Date(dataIso);
  if (isNaN(data.getTime())) return '-';

  if (comHora) {
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formata bytes em formato legível (KB, MB)
 */
function formatarBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Retorna classe e rótulo amigável para os status do fluxo
 */
function obterInfoStatus(status) {
  const mapa = {
    ENVIADA: {
      rotulo: 'Enviada',
      classe: 'badge-enviada',
      descricao: 'Prova cadastrada pelo professor.',
    },
    AGUARDANDO_CONFERENCIA: {
      rotulo: 'Aguardando Conferência',
      classe: 'badge-aguardando-conferencia',
      descricao: 'Na fila do Setor de Provas.',
    },
    EM_CONFERENCIA: {
      rotulo: 'Em Conferência',
      classe: 'badge-em-conferencia',
      descricao: 'Um funcionário está analisando o documento.',
    },
    AGUARDANDO_CORRECAO: {
      rotulo: 'Aguardando Correção',
      classe: 'badge-aguardando-correcao',
      descricao: 'Problemas identificados pelo setor.',
    },
    AGUARDANDO_VALIDACAO_PROFESSOR: {
      rotulo: 'Validação do Professor',
      classe: 'badge-aguardando-validacao-professor',
      descricao: 'Nova versão aguarda aceite de conteúdo do professor.',
    },
    AJUSTES_SOLICITADOS: {
      rotulo: 'Ajustes Solicitados',
      classe: 'badge-ajustes-solicitados',
      descricao: 'Professor solicitou alterações na versão.',
    },
    AGUARDANDO_APROVACAO_FINAL: {
      rotulo: 'Aprovação Final',
      classe: 'badge-aguardando-aprovacao-final',
      descricao: 'Pronta para autorização do responsável do setor.',
    },
    APROVADA_PARA_IMPRESSAO: {
      rotulo: 'Aprovada para Impressão',
      classe: 'badge-aprovada-para-impressao',
      descricao: 'Liberada exclusivamente para impressão.',
    },
    CONCLUIDA: {
      rotulo: 'Concluída',
      classe: 'badge-concluida',
      descricao: 'Processo da prova finalizado.',
    },
  };

  return mapa[status] || { rotulo: status, classe: 'badge-secondary', descricao: '' };
}

/**
 * Retorna nome legível para perfis
 */
function obterNomePerfil(perfil) {
  const mapa = {
    professor: 'Professor',
    setor_provas: 'Setor de Provas',
    responsavel_aprovacao: 'Resp. Aprovação',
    coordenacao: 'Coordenação',
    admin: 'Administrador',
  };
  return mapa[perfil] || perfil;
}
