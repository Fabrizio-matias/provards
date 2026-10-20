/**
 * SISTEMA DE GERENCIAMENTO DO SETOR DE PROVAS - DASHBOARD CONTROLLER
 */

async function carregarDashboard() {
  const tbody = document.getElementById('tabela-provas-recentes');

  try {
    const data = await apiRequest('/dashboard');

    if (!data.sucesso) {
      throw new Error(data.mensagem || 'Erro ao carregar dados do dashboard.');
    }

    const { metricas, provasRecentes } = data;

    // Atualiza cards de métricas
    document.getElementById('metric-total').textContent = metricas.total || 0;
    document.getElementById('metric-aguardando-conferencia').textContent = metricas.aguardandoConferencia || 0;
    document.getElementById('metric-em-conferencia').textContent =
      (metricas.emConferencia || 0) + (metricas.aguardandoCorrecao || 0) + (metricas.ajustesSolicitados || 0);
    document.getElementById('metric-validacao-professor').textContent = metricas.aguardandoValidacaoProfessor || 0;
    document.getElementById('metric-aprovacao-final').textContent = metricas.aguardandoAprovacaoFinal || 0;
    document.getElementById('metric-aprovadas-impressao').textContent = metricas.aprovadasImpressao || 0;
    document.getElementById('metric-atrasadas').textContent = metricas.atrasadas || 0;

    // Atualiza widgets AG / AD
    document.getElementById('count-divisao-ag').textContent = (metricas.divisao && metricas.divisao.AG) || 0;
    document.getElementById('count-divisao-ad').textContent = (metricas.divisao && metricas.divisao.AD) || 0;

    // Atualiza widgets Trimestres
    document.getElementById('count-trimestre-1').textContent = (metricas.trimestres && metricas.trimestres['1º']) || 0;
    document.getElementById('count-trimestre-2').textContent = (metricas.trimestres && metricas.trimestres['2º']) || 0;
    document.getElementById('count-trimestre-3').textContent = (metricas.trimestres && metricas.trimestres['3º']) || 0;

    // Renderiza tabela de provas recentes
    if (!provasRecentes || provasRecentes.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              <h4>Nenhuma prova cadastrada recentemente</h4>
              <p>Cadastre uma nova avaliação para iniciar o fluxo de conferência.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = provasRecentes
      .map((p) => {
        const infoStatus = obterInfoStatus(p.status);
        const divisaoClass = p.divisao === 'AG' ? 'badge-divisao-ag' : 'badge-divisao-ad';
        const isAtrasada =
          new Date(p.prazoEntrega) < new Date() &&
          !['APROVADA_PARA_IMPRESSAO', 'CONCLUIDA'].includes(p.status);

        return `
          <tr>
            <td>
              <strong style="color: var(--primary); font-family: monospace; font-size: 0.92rem;">
                ${p.codigo || '-'}
              </strong>
            </td>
            <td>
              <div><strong>${p.titulo}</strong></div>
              <small style="color: var(--text-muted);">${p.disciplina}</small>
            </td>
            <td>${p.professorId ? p.professorId.nome : 'Professor'}</td>
            <td><span class="badge" style="background: #e2e8f0; color: #334155;">${p.turma}</span></td>
            <td>
              <div style="display: flex; gap: 0.35rem; align-items: center;">
                <span class="badge badge-trimestre">${p.trimestre} Trim</span>
                <span class="badge ${divisaoClass}">${p.divisao}</span>
              </div>
            </td>
            <td>
              <div>${formatarData(p.prazoEntrega)}</div>
              ${isAtrasada ? `<span class="badge badge-atrasada" style="font-size: 0.65rem;">⚠️ Atrasada</span>` : ''}
            </td>
            <td>
              <span class="badge ${infoStatus.classe}">
                <span class="badge-dot" style="background: currentColor;"></span>
                ${infoStatus.rotulo}
              </span>
            </td>
            <td>
              <a href="detalhes-prova.html?id=${p._id}" class="btn btn-outline btn-sm">
                Detalhes &rarr;
              </a>
            </td>
          </tr>
        `;
      })
      .join('');
  } catch (error) {
    console.error('Falha ao carregar dashboard:', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: var(--danger); padding: 2rem;">
          ❌ Falha ao carregar dados do dashboard: ${error.message}
        </td>
      </tr>
    `;
    showToast(`Erro ao carregar métricas: ${error.message}`, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  carregarDashboard();
});
