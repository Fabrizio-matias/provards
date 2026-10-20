/**
 * SISTEMA DE GERENCIAMENTO DO SETOR DE PROVAS - RELATÓRIOS ANALÍTICOS
 */

async function carregarRelatorio() {
  const tbody = document.getElementById('tabela-relatorio');
  tbody.innerHTML = `
    <tr>
      <td colspan="10" class="loading-container">
        <span class="spinner"></span>
        <span>Processando dados estatísticos...</span>
      </td>
    </tr>
  `;

  const trimestre = document.getElementById('rel-trimestre').value;
  const divisao = document.getElementById('rel-divisao').value;
  const turma = document.getElementById('rel-turma').value.trim();
  const disciplina = document.getElementById('rel-disciplina').value.trim();
  const status = document.getElementById('rel-status').value;

  const params = new URLSearchParams();
  if (trimestre) params.append('trimestre', trimestre);
  if (divisao) params.append('divisao', divisao);
  if (turma) params.append('turma', turma);
  if (disciplina) params.append('disciplina', disciplina);
  if (status) params.append('status', status);

  try {
    const data = await apiRequest(`/relatorios/provas?${params.toString()}`);

    if (!data.sucesso) {
      throw new Error(data.mensagem || 'Erro ao gerar relatório.');
    }

    const { totalProvas, resumo, provas } = data;
    document.getElementById('total-relatorio').textContent = totalProvas || 0;

    // Renderiza Resumo por Divisão AG / AD
    const resDivisao = document.getElementById('resumo-divisao');
    if (resumo.porDivisao && resumo.porDivisao.length > 0) {
      resDivisao.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.65rem;">
          ${resumo.porDivisao
            .map(
              (d) => `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="badge ${d._id === 'AG' ? 'badge-divisao-ag' : 'badge-divisao-ad'}">
                ${d._id} — ${d._id === 'AG' ? 'Geral' : 'Diversificada'}
              </span>
              <strong>${d.total} (${Math.round((d.total / (totalProvas || 1)) * 100)}%)</strong>
            </div>
          `
            )
            .join('')}
        </div>
      `;
    } else {
      resDivisao.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">Sem dados para exibir.</p>';
    }

    // Renderiza Resumo por Trimestre
    const resTrimestre = document.getElementById('resumo-trimestre');
    if (resumo.porTrimestre && resumo.porTrimestre.length > 0) {
      resTrimestre.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.65rem;">
          ${resumo.porTrimestre
            .map(
              (t) => `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="badge badge-trimestre">${t._id} Trimestre</span>
              <strong>${t.total} (${Math.round((t.total / (totalProvas || 1)) * 100)}%)</strong>
            </div>
          `
            )
            .join('')}
        </div>
      `;
    } else {
      resTrimestre.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">Sem dados para exibir.</p>';
    }

    // Renderiza Resumo por Status
    const resStatus = document.getElementById('resumo-status');
    if (resumo.porStatus && resumo.porStatus.length > 0) {
      resStatus.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.65rem;">
          ${resumo.porStatus
            .map((s) => {
              const info = obterInfoStatus(s._id);
              return `
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="badge ${info.classe}">${info.rotulo}</span>
                <strong>${s.total}</strong>
              </div>
            `;
            })
            .join('')}
        </div>
      `;
    } else {
      resStatus.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">Sem dados para exibir.</p>';
    }

    // Tabela detalhada
    if (!provas || provas.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10">
            <div class="empty-state">
              <h4>Nenhum registro encontrado</h4>
              <p>Nenhuma prova corresponde aos critérios do relatório.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = provas
      .map((p) => {
        const infoStatus = obterInfoStatus(p.status);
        const divisaoClass = p.divisao === 'AG' ? 'badge-divisao-ag' : 'badge-divisao-ad';

        return `
          <tr>
            <td><strong style="font-family: monospace; color: var(--primary);">${p.codigo}</strong></td>
            <td><strong>${p.titulo}</strong></td>
            <td>${p.disciplina}</td>
            <td><span class="badge" style="background: #e2e8f0; color: #334155;">${p.turma}</span></td>
            <td><span class="badge badge-trimestre">${p.trimestre}</span></td>
            <td><span class="badge ${divisaoClass}">${p.divisao}</span></td>
            <td>${p.professorId ? p.professorId.nome : 'Professor'}</td>
            <td>${formatarData(p.dataAplicacao)}</td>
            <td>${formatarData(p.prazoEntrega)}</td>
            <td>
              <span class="badge ${infoStatus.classe}">
                ${infoStatus.rotulo}
              </span>
            </td>
          </tr>
        `;
      })
      .join('');
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align: center; color: var(--danger); padding: 2rem;">
          ❌ Erro ao carregar relatório: ${error.message}
        </td>
      </tr>
    `;
    showToast(error.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-gerar-relatorio').addEventListener('click', carregarRelatorio);
  carregarRelatorio();
});
