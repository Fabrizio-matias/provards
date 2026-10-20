/**
 * SISTEMA DE GERENCIAMENTO DO SETOR DE PROVAS - CADASTRO DE NOVA PROVA
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = getUsuarioLogado();
  if (!user) return;

  // Apenas professores e administradores podem cadastrar provas
  if (!['professor', 'admin'].includes(user.perfil)) {
    showToast('Apenas professores e administradores podem cadastrar novas provas.', 'error');
    setTimeout(() => {
      window.location.href = 'provas.html';
    }, 1500);
    return;
  }

  // Preenche disciplina padrão se for professor
  if (user.perfil === 'professor' && user.disciplinaPadrao) {
    const inputDisc = document.getElementById('input-disciplina');
    if (inputDisc) inputDisc.value = user.disciplinaPadrao;
  }

  // Se for admin, carrega lista de professores para seleção
  if (user.perfil === 'admin') {
    const grupoAdminProf = document.getElementById('grupo-admin-professor');
    const selectProf = document.getElementById('select-professor');
    grupoAdminProf.style.display = 'flex';
    selectProf.required = true;

    try {
      const resp = await apiRequest('/usuarios?perfil=professor');
      if (resp.usuarios) {
        resp.usuarios.forEach((p) => {
          const opt = document.createElement('option');
          opt.value = p._id;
          opt.textContent = `${p.nome} (${p.disciplinaPadrao || p.email})`;
          selectProf.appendChild(opt);
        });
      }
    } catch (err) {
      console.warn('Não foi possível carregar lista de professores:', err);
    }
  }

  // Configuração de datas sugeridas padrão
  const hoje = new Date();
  const proximaSemana = new Date(hoje.getTime() + 10 * 24 * 60 * 60 * 1000);
  const prazo = new Date(hoje.getTime() + 5 * 24 * 60 * 60 * 1000);

  document.getElementById('input-data-aplicacao').value = proximaSemana.toISOString().split('T')[0];
  document.getElementById('input-prazo-entrega').value = prazo.toISOString().split('T')[0];

  // Configura Drag & Drop do Arquivo
  const dropzone = document.getElementById('dropzone-arquivo');
  const fileInput = document.getElementById('input-arquivo');
  const fileNameDisplay = document.getElementById('file-name-display');

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      atualizarNomeArquivo(fileInput.files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
      atualizarNomeArquivo(fileInput.files[0]);
    }
  });

  function atualizarNomeArquivo(file) {
    if (!file) return;
    fileNameDisplay.textContent = `📎 Arquivo selecionado: ${file.name} (${formatarBytes(file.size)})`;
    fileNameDisplay.style.display = 'inline-block';
  }

  // Submissão do Formulário
  const form = document.getElementById('form-nova-prova');
  const btnSubmit = document.getElementById('btn-submit-prova');
  const btnText = document.getElementById('btn-submit-text');
  const btnSpinner = document.getElementById('btn-submit-spinner');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const titulo = document.getElementById('input-titulo').value.trim();
    const disciplina = document.getElementById('input-disciplina').value.trim();
    const turma = document.getElementById('input-turma').value.trim();
    const trimestre = document.getElementById('select-trimestre').value;
    const divisao = document.getElementById('select-divisao').value;
    const dataAplicacao = document.getElementById('input-data-aplicacao').value;
    const prazoEntrega = document.getElementById('input-prazo-entrega').value;
    const observacoes = document.getElementById('textarea-observacoes').value.trim();
    const arquivo = fileInput.files[0];

    if (!arquivo) {
      showToast('Por favor, anexe o arquivo da avaliação.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('titulo', titulo);
    formData.append('disciplina', disciplina);
    formData.append('turma', turma);
    formData.append('trimestre', trimestre);
    formData.append('divisao', divisao);
    formData.append('dataAplicacao', dataAplicacao);
    formData.append('prazoEntrega', prazoEntrega);
    formData.append('observacoes', observacoes);
    formData.append('arquivo', arquivo);

    if (user.perfil === 'admin') {
      const profId = document.getElementById('select-professor').value;
      if (profId) formData.append('professorId', profId);
    }

    btnSubmit.disabled = true;
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline-block';

    try {
      const data = await apiRequest('/provas', {
        method: 'POST',
        body: formData,
      });

      showToast(`Prova ${data.prova.codigo} cadastrada com sucesso!`, 'success');
      setTimeout(() => {
        window.location.href = `detalhes-prova.html?id=${data.prova._id}`;
      }, 1000);
    } catch (err) {
      showToast(err.message || 'Erro ao cadastrar prova.', 'error');
      btnSubmit.disabled = false;
      btnText.style.display = 'inline-block';
      btnSpinner.style.display = 'none';
    }
  });
});
