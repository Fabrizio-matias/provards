/**
 * SISTEMA DE GERENCIAMENTO DO SETOR DE PROVAS - AUDITORIA DE ATIVIDADES
 */

async function carregarAtividades() {
  const tbody = document.getElementById('tabela-atividades');

  try {
    const data = await apiRequest('/atividades?limit=50');

    if (!data.sucesso) {
      throw new Error(data.mensagem || 'Erro ao carregar auditoria.');
    }

    const { total, atividades } = data;
    document.getElementById('total-atividades').textContent = total || 0;

    if (!atividades || atividades.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-state">
              <h4>Nenhuma atividade registrada</h4>
              <p>Os registros operacionais aparecerão aqui conforme as ações forem executadas.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = atividades
      .map((a) => {
        let badgeStyle = 'background: #f1f5f9; color: #334155;';
        if (a.acao.includes('APROVACAO')) {
          badgeStyle = 'background: #dcfce7; color: #166534; font-weight: 700;';
        } else if (a.acao.includes('CRIACAO') || a.acao.includes('NOVA_VERSAO')) {
          badgeStyle = 'background: #e0f2fe; color: #0369a1; font-weight: 700;';
        } else if (a.acao.includes('DOWNLOAD_IMPRESSAO')) {
          badgeStyle = 'background: #fef3c7; color: #b45309; font-weight: 700;';
        } else if (a.acao.includes('AJUSTES') || a.acao.includes('CORRECAO')) {
          badgeStyle = 'background: #fee2e2; color: #991b1b; font-weight: 700;';
        }

        const linkProva = a.provaId
          ? `<a href="detalhes-prova.html?id=${a.provaId._id || a.provaId}" style="color: var(--primary); font-family: monospace; font-weight: 600;">
              ${a.provaId.codigo || 'Ver Prova'} &rarr;
            </a>`
          : '-';

        return `
          <tr>
            <td style="white-space: nowrap;">${formatarData(a.dataHora, true)}</td>
            <td><strong>${a.usuarioId ? a.usuarioId.nome : 'Sistema'}</strong></td>
            <td>
              <span class="badge" style="background: #f1f5f9; color: #475569;">
                ${a.usuarioId ? obterNomePerfil(a.usuarioId.perfil) : '-'}
              </span>
            </td>
            <td>
              <span class="badge" style="${badgeStyle}">
                ${a.acao}
              </span>
            </td>
            <td>${a.descricao}</td>
            <td>${linkProva}</td>
          </tr>
        `;
      })
      .join('');
  } catch (error) {
    console.error('Falha ao carregar atividades:', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--danger); padding: 2rem;">
          ❌ Erro ao listar logs de auditoria: ${error.message}
        </td>
      </tr>
    `;
    showToast(error.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  carregarAtividades();
});
