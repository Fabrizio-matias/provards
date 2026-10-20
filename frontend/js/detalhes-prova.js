/**
 * SISTEMA DE GERENCIAMENTO DO SETOR DE PROVAS - DETALHES E WORKFLOW
 */

let provaAtual = null;
let versoesAtuais = [];
const urlParams = new URLSearchParams(window.location.search);
const provaId = urlParams.get('id');

function fecharModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('show');
}

function abrirModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('show');
}

async function carregarDetalhesProva() {
  if (!provaId) {
    showToast('Identificador de prova não informado.', 'error');
    setTimeout(() => (window.location.href = 'provas.html'), 1500);
    return;
  }

  try {
    const [resProva, resVersoes] = await Promise.all([
      apiRequest(`/provas/${provaId}`),
      apiRequest(`/provas/${provaId}/versoes`),
    ]);

    if (!resProva.sucesso) {
      throw new Error(resProva.mensagem || 'Prova não encontrada.');
    }

    provaAtual = resProva.prova;
    versoesAtuais = resVersoes.versoes || [];

    renderizarDadosProva();
    renderizarVersaoAtual();
    renderizarBoxImpressao();
    renderizarBotoesFluxo();
    renderizarHistoricoVersoes();
  } catch (error) {
    console.error('Falha ao carregar prova:', error);
    showToast(`Erro ao carregar detalhes: ${error.message}`, 'error');
  }
}

/**
 * Renderiza identificação, trimestre, divisão AG/AD e status
 */
function renderizarDadosProva() {
  document.getElementById('header-codigo-prova').textContent = provaAtual.codigo || '';
  document.getElementById('detalhe-titulo').textContent = provaAtual.titulo;
  document.getElementById('detalhe-disciplina').textContent = provaAtual.disciplina;
  document.getElementById('detalhe-professor').textContent = provaAtual.professorId
    ? `${provaAtual.professorId.nome} (${provaAtual.professorId.email})`
    : 'Não informado';
  document.getElementById('detalhe-turma').textContent = provaAtual.turma;
  document.getElementById('detalhe-data-aplicacao').textContent = formatarData(provaAtual.dataAplicacao);
  document.getElementById('detalhe-prazo-entrega').textContent = formatarData(provaAtual.prazoEntrega);
  document.getElementById('detalhe-observacoes').textContent =
    provaAtual.observacoes || 'Nenhuma observação ou orientação cadastrada.';

  // Badges de Trimestre e Divisão AG/AD
  const divisaoClass = provaAtual.divisao === 'AG' ? 'badge-divisao-ag' : 'badge-divisao-ad';
  document.getElementById('badge-trimestre-divisao').innerHTML = `
    <span class="badge badge-trimestre">${provaAtual.trimestre} Trimestre</span>
    <span class="badge ${divisaoClass}">${provaAtual.divisao} — ${provaAtual.divisao === 'AG' ? 'Avaliação Geral' : 'Avaliação Diversificada'}</span>
  `;

  // Status Atual no Topo
  const statusInfo = obterInfoStatus(provaAtual.status);
  const badgeStatus = document.getElementById('badge-status-atual');
  badgeStatus.className = `badge ${statusInfo.classe}`;
  badgeStatus.innerHTML = `<span class="badge-dot" style="background: currentColor;"></span> ${statusInfo.rotulo}`;
  document.getElementById('status-descricao-detalhada').textContent = statusInfo.descricao;
}

/**
 * Renderiza o card da versão atual ativa
 */
function renderizarVersaoAtual() {
  const container = document.getElementById('card-versao-atual-conteudo');
  const versao = provaAtual.versaoAtualId;

  if (!versao) {
    container.innerHTML = '<p style="color: var(--text-muted);">Nenhuma versão ativa disponível.</p>';
    return;
  }

  document.getElementById('badge-versao-numero').textContent = `Versão V${versao.numero || provaAtual.versaoAtualNumero || 1}`;

  const urlDownload = versao.arquivo.url.startsWith('http')
    ? versao.arquivo.url
    : `${API_BASE_URL.replace('/api', '')}${versao.arquivo.url}`;

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 0.85rem;">
      <div>
        <label class="form-label" style="font-size: 0.75rem; color: var(--text-muted);">Arquivo Original</label>
        <div style="font-weight: 600; word-break: break-all; color: var(--text-main); font-size: 0.9rem;">
          📄 ${versao.arquivo.nomeOriginal}
        </div>
        <small style="color: var(--text-muted);">${formatarBytes(versao.arquivo.tamanhoBytes)}</small>
      </div>

      <div>
        <label class="form-label" style="font-size: 0.75rem; color: var(--text-muted);">Data de Envio</label>
        <div style="font-size: 0.85rem;">${formatarData(versao.dataEnvio, true)}</div>
      </div>

      ${
        versao.descricaoAlteracoes
          ? `<div>
              <label class="form-label" style="font-size: 0.75rem; color: var(--text-muted);">Alterações Nesta Versão</label>
              <div style="font-size: 0.85rem; background: #f8fafc; padding: 0.5rem; border-radius: 4px; border-left: 2px solid var(--primary);">
                ${versao.descricaoAlteracoes}
              </div>
            </div>`
          : ''
      }

      <div style="margin-top: 0.5rem;">
        <a href="${urlDownload}" target="_blank" download="${versao.arquivo.nomeOriginal}" class="btn btn-outline btn-sm" style="width: 100%;">
          ⬇️ Baixar Arquivo de Trabalho (Rascunho)
        </a>
      </div>
    </div>
  `;
}

/**
 * REQUISITO 8: Renderiza o componente de Bloqueio ou Liberação de Impressão
 */
function renderizarBoxImpressao() {
  const container = document.getElementById('box-impressao');
  const user = getUsuarioLogado();

  const isAprovada =
    provaAtual.liberadaParaImpressao &&
    provaAtual.versaoAprovadaId &&
    (provaAtual.status === 'APROVADA_PARA_IMPRESSAO' || provaAtual.status === 'CONCLUIDA');

  if (isAprovada) {
    const versaoAprovada = provaAtual.versaoAprovadaId;
    container.innerHTML = `
      <div class="print-unlocked-box">
        <div style="display: flex; align-items: center; gap: 0.85rem;">
          <span style="font-size: 2rem;">🖨️</span>
          <div>
            <h4 style="font-weight: 800; font-size: 1.05rem; letter-spacing: -0.01em;">
              PROVA AUTORIZADA PARA IMPRESSÃO (VERSÃO V${versaoAprovada.numero || provaAtual.versaoAtualNumero})
            </h4>
            <p style="font-size: 0.82rem; margin-top: 0.2rem;">
              Aprovada e homologada pelo Setor de Provas em <strong>${formatarData(versaoAprovada.dataAprovacaoFinal, true)}</strong>.
              Arquivo liberado exclusivamente para a equipe autorizada.
            </p>
          </div>
        </div>

        <div>
          <button type="button" class="btn btn-print" onclick="baixarArquivoImpressao()">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
            Baixar Arquivo Oficial de Impressão
          </button>
        </div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="print-lock-box">
        <span style="font-size: 1.8rem;">🔒</span>
        <div style="flex: 1;">
          <h4 style="font-weight: 700; font-size: 0.95rem;">IMPRESSÃO BLOQUEADA</h4>
          <p style="font-size: 0.82rem; margin-top: 0.15rem; color: #b91c1c;">
            Esta avaliação ainda <strong>não possui autorização final de impressão</strong> ou possui etapas pendentes de conferência/validação. Conforme as regras pedagógicas do colégio, o arquivo de impressão permanece estritamente bloqueado no backend.
          </p>
        </div>
        <button type="button" class="btn btn-print-locked btn-sm" disabled title="Impressão bloqueada até aprovação final">
          🔒 Impressão Bloqueada
        </button>
      </div>
    `;
  }
}

/**
 * Renderiza os botões do fluxo de trabalho baseados em PERFIL e STATUS
 */
function renderizarBotoesFluxo() {
  const container = document.getElementById('container-acoes-fluxo');
  const user = getUsuarioLogado();
  if (!user) return;

  container.innerHTML = '';
  const status = provaAtual.status;
  const perfil = user.perfil;
  const isDono =
    provaAtual.professorId &&
    (provaAtual.professorId._id === user.id || provaAtual.professorId === user.id);

  // 1. Ações do Setor de Provas / Admin
  if (['setor_provas', 'admin'].includes(perfil)) {
    if (status === 'ENVIADA' || status === 'AGUARDANDO_CONFERENCIA') {
      container.innerHTML += `
        <button type="button" class="btn btn-primary btn-sm" onclick="iniciarConferencia()">
          🔍 Iniciar Conferência
        </button>
      `;
    }

    if (status === 'EM_CONFERENCIA') {
      container.innerHTML += `
        <button type="button" class="btn btn-warning btn-sm" onclick="abrirModal('modal-solicitar-correcao')">
          ⚠️ Solicitar Correção
        </button>
        <button type="button" class="btn btn-primary btn-sm" onclick="abrirModal('modal-nova-versao')">
          📤 Enviar Nova Versão (V${(provaAtual.versaoAtualNumero || 1) + 1})
        </button>
      `;
    }

    if (['AGUARDANDO_CORRECAO', 'AJUSTES_SOLICITADOS'].includes(status)) {
      container.innerHTML += `
        <button type="button" class="btn btn-primary btn-sm" onclick="abrirModal('modal-nova-versao')">
          📤 Enviar Versão Corrigida (V${(provaAtual.versaoAtualNumero || 1) + 1})
        </button>
      `;
    }

    if (status === 'APROVADA_PARA_IMPRESSAO') {
      container.innerHTML += `
        <button type="button" class="btn btn-success btn-sm" onclick="concluirProva()">
          🏁 Concluir Processo
        </button>
      `;
    }
  }

  // 2. Ações do Professor Responsável / Admin
  if ((perfil === 'professor' && isDono) || perfil === 'admin') {
    if (status === 'AGUARDANDO_VALIDACAO_PROFESSOR') {
      container.innerHTML += `
        <button type="button" class="btn btn-primary btn-sm" onclick="abrirModal('modal-validacao-professor')">
          ✍️ Validar Conteúdo da Versão
        </button>
      `;
    }
  }

  // 3. Ações do Responsável pela Aprovação Final / Admin
  if (['responsavel_aprovacao', 'admin'].includes(perfil)) {
    if (status === 'AGUARDANDO_APROVACAO_FINAL') {
      container.innerHTML += `
        <button type="button" class="btn btn-success btn-sm" onclick="abrirModal('modal-aprovacao-final')">
          ✅ Conceder Aprovação Final e Liberar Impressão
        </button>
      `;
    }
  }
}

/**
 * Renderiza o histórico de todas as versões V1, V2, V3...
 */
function renderizarHistoricoVersoes() {
  const container = document.getElementById('container-lista-versoes');

  if (!versoesAtuais || versoesAtuais.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted);">Nenhum histórico registrado.</p>';
    return;
  }

  container.innerHTML = versoesAtuais
    .map((v) => {
      const isCurrent = v.numero === (provaAtual.versaoAtualNumero || 1);
      const isApprovedPrint = v.liberadaImpressao;
      const downloadUrl = v.arquivo.url.startsWith('http')
        ? v.arquivo.url
        : `${API_BASE_URL.replace('/api', '')}${v.arquivo.url}`;

      return `
        <div class="version-card ${isCurrent ? 'current' : ''}">
          <div class="version-header">
            <div class="version-title">
              <span class="badge" style="background: ${isCurrent ? 'var(--primary)' : '#64748b'}; color: white; font-size: 0.82rem;">
                Versão V${v.numero}
              </span>
              <span>${v.arquivo.nomeOriginal}</span>
              ${isCurrent ? '<span class="badge badge-enviada">Versão Ativa</span>' : ''}
              ${isApprovedPrint ? '<span class="badge badge-aprovada-para-impressao">Aprovada p/ Impressão</span>' : ''}
            </div>
            <div class="version-meta">
              Enviado em ${formatarData(v.dataEnvio, true)} por <strong>${v.enviadoPor ? v.enviadoPor.nome : 'Usuário'}</strong>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem; margin-top: 0.5rem; font-size: 0.85rem;">
            <div>
              <span style="color: var(--text-muted); font-size: 0.75rem; display: block;">Validação do Professor:</span>
              <strong>${v.statusValidacaoProfessor}</strong>
              ${v.parecerProfessor ? `<div style="font-size: 0.78rem; color: #475569;">"${v.parecerProfessor}"</div>` : ''}
            </div>

            <div>
              <span style="color: var(--text-muted); font-size: 0.75rem; display: block;">Aprovação Final do Setor:</span>
              <strong>${v.statusAprovacaoFinal}</strong>
              ${v.aprovadoPor ? `<div style="font-size: 0.78rem; color: #475569;">Por: ${v.aprovadoPor.nome} em ${formatarData(v.dataAprovacaoFinal, true)}</div>` : ''}
            </div>

            <div style="text-align: right; align-self: center;">
              <a href="${downloadUrl}" target="_blank" download="${v.arquivo.nomeOriginal}" class="btn btn-outline btn-sm">
                ⬇️ Baixar Arquivo V${v.numero}
              </a>
            </div>
          </div>

          ${
            v.descricaoAlteracoes
              ? `<div class="version-diff-box">
                  <strong>Alterações descritas:</strong> ${v.descricaoAlteracoes}
                  ${v.observacoesSetor ? `<br><strong>Obs. do setor:</strong> ${v.observacoesSetor}` : ''}
                </div>`
              : ''
          }
        </div>
      `;
    })
    .join('');
}

/* ==========================================================================
   AÇÕES DO WORKFLOW
   ========================================================================== */

async function iniciarConferencia() {
  try {
    const res = await apiRequest(`/provas/${provaId}/iniciar-conferencia`, { method: 'POST' });
    showToast(res.mensagem || 'Conferência iniciada!', 'success');
    carregarDetalhesProva();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function confirmarSolicitacaoCorrecao() {
  const motivo = document.getElementById('textarea-motivo-correcao').value.trim();
  if (!motivo) {
    showToast('Informe o motivo ou as pendências encontradas.', 'warning');
    return;
  }

  try {
    const res = await apiRequest(`/provas/${provaId}/solicitar-correcao`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    });
    fecharModal('modal-solicitar-correcao');
    showToast(res.mensagem || 'Correção solicitada!', 'success');
    carregarDetalhesProva();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Upload de Nova Versão pelo Setor
document.getElementById('form-upload-versao').addEventListener('submit', async (e) => {
  e.preventDefault();

  const fileInput = document.getElementById('input-arquivo-versao');
  const descricao = document.getElementById('input-descricao-alteracoes').value.trim();
  const obsSetor = document.getElementById('input-obs-setor').value.trim();
  const alteracaoConteudo = document.getElementById('check-alteracao-conteudo').checked;

  if (!fileInput.files.length) {
    showToast('Anexe o arquivo corrigido.', 'warning');
    return;
  }

  const formData = new FormData();
  formData.append('arquivo', fileInput.files[0]);
  formData.append('descricaoAlteracoes', descricao);
  formData.append('observacoesSetor', obsSetor);
  formData.append('houveAlteracaoConteudo', alteracaoConteudo);

  const btnSubmit = document.getElementById('btn-submit-versao');
  btnSubmit.disabled = true;

  try {
    const res = await apiRequest(`/provas/${provaId}/versoes`, {
      method: 'POST',
      body: formData,
    });
    fecharModal('modal-nova-versao');
    showToast(res.mensagem || 'Nova versão enviada com sucesso!', 'success');
    carregarDetalhesProva();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btnSubmit.disabled = false;
  }
});

async function executarAcaoProfessor(acao) {
  const parecer = document.getElementById('textarea-parecer-professor').value.trim();

  try {
    let res;
    if (acao === 'validar') {
      res = await apiRequest(`/provas/${provaId}/validar-professor`, {
        method: 'POST',
        body: JSON.stringify({ parecer }),
      });
      showToast('Conteúdo validado com sucesso!', 'success');
    } else {
      if (!parecer) {
        showToast('Descreva detalhadamente os ajustes solicitados.', 'warning');
        return;
      }
      res = await apiRequest(`/provas/${provaId}/solicitar-ajustes`, {
        method: 'POST',
        body: JSON.stringify({ motivo: parecer }),
      });
      showToast('Ajustes solicitados com sucesso!', 'warning');
    }
    fecharModal('modal-validacao-professor');
    carregarDetalhesProva();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function confirmarAprovacaoFinal() {
  const justificativa = document.getElementById('textarea-justificativa-final').value.trim();

  try {
    const res = await apiRequest(`/provas/${provaId}/aprovar-final`, {
      method: 'POST',
      body: JSON.stringify({ justificativa }),
    });
    fecharModal('modal-aprovacao-final');
    showToast(res.mensagem || 'Prova aprovada para impressão!', 'success');
    carregarDetalhesProva();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function concluirProva() {
  if (!confirm('Deseja marcar esta prova como CONCLUÍDA?')) return;

  try {
    const res = await apiRequest(`/provas/${provaId}/concluir`, { method: 'POST' });
    showToast(res.mensagem || 'Prova concluída!', 'success');
    carregarDetalhesProva();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/**
 * REQUISITO 8: Realiza download do arquivo de impressão chamando o endpoint protegido
 */
async function baixarArquivoImpressao() {
  try {
    const token = localStorage.getItem('provas_token');
    const url = `${API_BASE_URL}/provas/${provaId}/arquivo-impressao`;

    // Fazemos requisição com token para validar autorização rígida no backend
    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!resp.ok) {
      const erro = await resp.json().catch(() => ({ mensagem: 'Falha no download' }));
      throw new Error(erro.mensagem || 'Acesso negado: Prova não liberada para impressão.');
    }

    const contentType = resp.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await resp.json();
      if (data.url) {
        const fullUrl = data.url.startsWith('http') ? data.url : `${API_BASE_URL.replace('/api', '')}${data.url}`;
        window.open(fullUrl, '_blank');
        return;
      }
    }

    // Se for download binário direto do backend
    const blob = await resp.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `IMPRESSAO_${provaAtual.codigo}_V${provaAtual.versaoAtualNumero}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('Download do arquivo oficial de impressão iniciado!', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  carregarDetalhesProva();
});
