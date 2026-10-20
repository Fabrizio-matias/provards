/**
 * SISTEMA DE GERENCIAMENTO DO SETOR DE PROVAS - CONTROLE DE AUTENTICAÇÃO
 */

function getUsuarioLogado() {
  const userJson = localStorage.getItem('provas_user');
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch (e) {
    return null;
  }
}

function isAutenticado() {
  const token = localStorage.getItem('provas_token');
  const user = getUsuarioLogado();
  return Boolean(token && user);
}

/**
 * Protege páginas privadas - redireciona para login se não autenticado
 */
function verificarAutenticacao() {
  const isLoginPage = window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('/');
  const logado = isAutenticado();

  if (!logado && !window.location.pathname.endsWith('login.html')) {
    window.location.href = 'login.html';
    return false;
  }

  if (logado && window.location.pathname.endsWith('login.html')) {
    window.location.href = 'dashboard.html';
    return false;
  }

  return true;
}

/**
 * Realiza logout e limpa dados da sessão
 */
async function fazerLogout() {
  try {
    await apiRequest('/auth/logout', { method: 'POST' });
  } catch (err) {
    // Prossegue com a limpeza local
  }
  localStorage.removeItem('provas_token');
  localStorage.removeItem('provas_user');
  window.location.href = 'login.html';
}

/**
 * Preenche dados do usuário no cabeçalho e controla visibilidade do menu por perfil
 */
function inicializarInterfaceUsuario() {
  const user = getUsuarioLogado();
  if (!user) return;

  // Atualiza nome e perfil no topo
  const userNameEl = document.getElementById('header-user-name');
  const userRoleEl = document.getElementById('header-user-role');
  const userAvatarEl = document.getElementById('header-user-avatar');

  if (userNameEl) userNameEl.textContent = user.nome;
  if (userRoleEl) userRoleEl.textContent = obterNomePerfil(user.perfil);
  if (userAvatarEl) {
    const iniciais = user.nome
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
    userAvatarEl.textContent = iniciais || 'U';
  }

  // Controle de visibilidade de itens de menu
  // Admin only: Usuários
  const navUsuarios = document.getElementById('nav-usuarios');
  if (navUsuarios) {
    if (user.perfil !== 'admin') {
      navUsuarios.style.display = 'none';
    }
  }

  // Criar Prova: apenas Professor e Admin
  const btnNovaProva = document.getElementById('btn-header-nova-prova');
  if (btnNovaProva) {
    if (!['professor', 'admin'].includes(user.perfil)) {
      btnNovaProva.style.display = 'none';
    }
  }

  // Botão de Logout
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', (e) => {
      e.preventDefault();
      fazerLogout();
    });
  }

  // Toggle do menu mobile
  const btnMobile = document.getElementById('mobile-toggle-btn');
  const sidebar = document.querySelector('.app-sidebar');
  if (btnMobile && sidebar) {
    btnMobile.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }
}

// Executa verificação básica ao carregar o script
document.addEventListener('DOMContentLoaded', () => {
  verificarAutenticacao();
  inicializarInterfaceUsuario();
});
