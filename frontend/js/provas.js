/**
 * SISTEMA DE GERENCIAMENTO DO SETOR DE PROVAS - LISTAGEM DE PROVAS
 */

let paginaAtual = 1;
let totalPaginas = 1;

async function carregarProvas(pagina = 1) {
  paginaAtual = pagina;
  const tbody = document.getElementById('tabela-provas');

  tbody.innerHTML = `
    <tr>
      <td colspan="10" class="loading-container">
        <span class="spinner"></span>
        <span>Buscando avaliações...</span>
      </td>
    </tr>
  `;

  const busca = document.getElementById('filtro-busca').value.trim();
  const trimestre = document.getElementById('filtro-trimestre').value;
  const divisao = document.getElementById('filtro-divisao').value;
  const turma = document.getElementById('filtro-turma').value.trim();
  const status = document.getElementById('filtro-status').value;
  const atrasadas = document.getElementById('filtro-atrasadas').checked;

  const params = new URLSearchParams({
    page: paginaAtual,
    limit: 15,
  });

  if (busca) params.append('busca', busca);
  if (trimestre) params.append('trimestre', trimestre);
  if (divisao) params.append('divisao', divisao);
  if (turma) params.append('turma', turma);
  if (status) params.append('status', status);
  if (atrasadas) params.append('atrasadas', 'true');

  try {
    const data = await apiRequest(`/provas?${params.toString()}`);

    if (!data.sucesso) {
      throw new Error(data.mensagem || 'Erro ao consultar provas.');
    }

    const { total, totalPaginas: totalPags, provas } = data;
    totalPaginas = totalPags || 1;

    document.getElementById('total-registros').textContent = total || 0;
    document.getElementById('info-paginacao').textContent = `Mostrando página ${paginaAtual} de ${totalPaginas} (${total} no total)`;

    document.getElementById('btn-pag-anterior').disabled = paginaAtual <= 1;
    document.getElementById('btn-pag-proxima').disabled = paginaAtual >= totalPaginas;

    if (!provas || provas.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10">
            <div class="empty-state">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              <h4>Nenhuma avaliação encontrada</h4>
              <p>Nenhuma prova atende aos critérios e filtros selecionados.</p>
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
            <td>${formatarData(p.dataAplicacao)}</td>
            <td>
              <div>${formatarData(p.prazoEntrega)}</div>
              ${isAtrasada ? `<span class="badge badge-atrasada" style="font-size: 0.65rem;">⚠️ Atrasada</span>` : ''}
            </td>
            <td>
              <span class="badge" style="background: #f3f4f6; color: #1f2937; font-weight: 700;">
                V${p.versaoAtualNumero || 1}
              </span>
            </td>
            <td>
              <span class="badge ${infoStatus.classe}">
                <span class="badge-dot" style="background: currentColor;"></span>
                ${infoStatus.rotulo}
              </span>
            </td>
            <td>
              <a href="detalhes-prova.html?id=${p._id}" class="btn btn-outline btn-sm">
                Abrir &rarr;
              </a>
            </td>
          </tr>
        `;
      })
      .join('');
  } catch (error) {
    console.error('Falha ao listar provas:', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align: center; color: var(--danger); padding: 2rem;">
          ❌ Erro ao carregar avaliações: ${error.message}
        </td>
      </tr>
    `;
    showToast(`Erro ao carregar lista de provas: ${error.message}`, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Ler eventuais filtros passados na URL (ex: ?trimestre=2º&divisao=AG)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('trimestre')) {
    document.getElementById('filtro-trimestre').value = urlParams.get('trimestre');
  }
  if (urlParams.get('divisao')) {
    document.getElementById('filtro-divisao').value = urlParams.get('divisao');
  }
  if (urlParams.get('status')) {
    document.getElementById('filtro-status').value = urlParams.get('status');
  }
  if (urlParams.get('atrasadas') === 'true') {
    document.getElementById('filtro-atrasadas').checked = true;
  }

  // Eventos de Filtro
  document.getElementById('btn-aplicar-filtros').addEventListener('click', () => carregarProvas(1));
  document.getElementById('filtro-busca').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') carregarProvas(1);
  });

  document.getElementById('btn-limpar-filtros').addEventListener('click', () => {
    document.getElementById('filtro-busca').value = '';
    document.getElementById('filtro-trimestre').value = '';
    document.getElementById('filtro-divisao').value = '';
    document.getElementById('filtro-turma').value = '';
    document.getElementById('filtro-status').value = '';
    document.getElementById('filtro-atrasadas').checked = false;
    carregarProvas(1);
  });

  // Paginação
  document.getElementById('btn-pag-anterior').addEventListener('click', () => {
    if (paginaAtual > 1) carregarProvas(paginaAtual - 1);
  });

  document.getElementById('btn-pag-proxima').addEventListener('click', () => {
    if (paginaAtual < totalPaginas) carregarProvas(paginaAtual + 1);
  });

  carregarProvas(1);
});
