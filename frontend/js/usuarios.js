/**
 * SISTEMA DE GERENCIAMENTO DO SETOR DE PROVAS - GESTÃO DE USUÁRIOS (ADMIN)
 */

let usuariosLista = [];

function fecharModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('show');
}

function abrirModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('show');
}

function abrirModalCriarUsuario() {
  document.getElementById('form-criar-usuario').reset();
  abrirModal('modal-novo-usuario');
}

function abrirModalEditar(id) {
  const u = usuariosLista.find((user) => user._id === id);
  if (!u) return;

  document.getElementById('edit-id').value = u._id;
  document.getElementById('edit-nome').value = u.nome;
  document.getElementById('edit-email').value = u.email;
  document.getElementById('edit-perfil').value = u.perfil;
  document.getElementById('edit-ativo').value = String(u.ativo);
  document.getElementById('edit-disciplina').value = u.disciplinaPadrao || '';
  document.getElementById('edit-nova-senha').value = '';

  abrirModal('modal-editar-usuario');
}

async function carregarUsuarios() {
  const user = getUsuarioLogado();
  if (!user || user.perfil !== 'admin') {
    showToast('Acesso restrito a Administradores.', 'error');
    setTimeout(() => (window.location.href = 'dashboard.html'), 1500);
    return;
  }

  const tbody = document.getElementById('tabela-usuarios');
  tbody.innerHTML = `
    <tr>
      <td colspan="7" class="loading-container">
        <span class="spinner"></span>
        <span>Carregando usuários...</span>
      </td>
    </tr>
  `;

  const busca = document.getElementById('filtro-usuario-busca').value.trim();
  const perfil = document.getElementById('filtro-usuario-perfil').value;
  const status = document.getElementById('filtro-usuario-status').value;

  const params = new URLSearchParams();
  if (busca) params.append('busca', busca);
  if (perfil) params.append('perfil', perfil);
  if (status !== '') params.append('ativo', status);

  try {
    const data = await apiRequest(`/usuarios?${params.toString()}`);

    if (!data.sucesso) {
      throw new Error(data.mensagem || 'Erro ao consultar usuários.');
    }

    usuariosLista = data.usuarios || [];
    document.getElementById('total-usuarios').textContent = data.total || 0;

    if (usuariosLista.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
              <h4>Nenhum usuário encontrado</h4>
              <p>Altere os filtros de pesquisa ou cadastre um novo usuário.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = usuariosLista
      .map((u) => {
        const ativoBadge = u.ativo
          ? '<span class="badge" style="background: #dcfce7; color: #166534;"><span class="badge-dot" style="background: #16a34a;"></span> Ativo</span>'
          : '<span class="badge" style="background: #fee2e2; color: #991b1b;"><span class="badge-dot" style="background: #dc2626;"></span> Inativo</span>';

        return `
          <tr>
            <td><strong>${u.nome}</strong></td>
            <td>${u.email}</td>
            <td>
              <span class="badge" style="background: #e0f2fe; color: #0369a1; font-weight: 700;">
                ${obterNomePerfil(u.perfil)}
              </span>
            </td>
            <td>${u.disciplinaPadrao || '-'}</td>
            <td>${ativoBadge}</td>
            <td>${formatarData(u.createdAt)}</td>
            <td>
              <button type="button" class="btn btn-outline btn-sm" onclick="abrirModalEditar('${u._id}')">
                Editar
              </button>
            </td>
          </tr>
        `;
      })
      .join('');
  } catch (error) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--danger); padding: 2rem;">
          ❌ Erro ao listar usuários: ${error.message}
        </td>
      </tr>
    `;
    showToast(error.message, 'error');
  }
}

// Criação de Usuário
document.getElementById('form-criar-usuario').addEventListener('submit', async (e) => {
  e.preventDefault();

  const nome = document.getElementById('novo-nome').value.trim();
  const email = document.getElementById('novo-email').value.trim();
  const senha = document.getElementById('novo-senha').value;
  const perfil = document.getElementById('novo-perfil').value;
  const disciplinaPadrao = document.getElementById('novo-disciplina').value.trim();

  try {
    const res = await apiRequest('/usuarios', {
      method: 'POST',
      body: JSON.stringify({ nome, email, senha, perfil, disciplinaPadrao }),
    });

    fecharModal('modal-novo-usuario');
    showToast(res.mensagem || 'Usuário criado com sucesso!', 'success');
    carregarUsuarios();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// Edição de Usuário
document.getElementById('form-editar-usuario').addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('edit-id').value;
  const nome = document.getElementById('edit-nome').value.trim();
  const email = document.getElementById('edit-email').value.trim();
  const perfil = document.getElementById('edit-perfil').value;
  const ativo = document.getElementById('edit-ativo').value === 'true';
  const disciplinaPadrao = document.getElementById('edit-disciplina').value.trim();
  const novaSenha = document.getElementById('edit-nova-senha').value;

  const payload = { nome, email, perfil, ativo, disciplinaPadrao };
  if (novaSenha && novaSenha.trim().length >= 6) {
    payload.novaSenha = novaSenha.trim();
  }

  try {
    const res = await apiRequest(`/usuarios/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    fecharModal('modal-editar-usuario');
    showToast(res.mensagem || 'Usuário atualizado com sucesso!', 'success');
    carregarUsuarios();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-filtrar-usuarios').addEventListener('click', carregarUsuarios);
  document.getElementById('filtro-usuario-busca').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') carregarUsuarios();
  });
  carregarUsuarios();
});
