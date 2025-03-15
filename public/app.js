document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('articleForm');
  const generateBtn = document.getElementById('generateBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const copyBtn = document.getElementById('copyBtn');
  const previewContainer = document.getElementById('previewContainer');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const articleTitle = document.getElementById('articleTitle');
  
  let currentArticleHtml = '';
  let currentFilename = '';
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // 获取表单数据
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // 显示加载状态
    generateBtn.disabled = true;
    generateBtn.textContent = '生成中...';
    previewContainer.innerHTML = '';
    loadingIndicator.style.display = 'flex';
    downloadBtn.disabled = true;
    copyBtn.disabled = true;
    
    try {
      // 调用API生成文章
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('生成失败');
      }
      
      const result = await response.json();
      
      if (result.success) {
        // 获取生成的文章内容
        if (result.data.filePath) {
          currentFilename = result.data.filePath.split('/').pop();
          const contentResponse = await fetch(`/api/articles/${currentFilename}`);
          const contentData = await contentResponse.json();
          currentArticleHtml = contentData.content;
          
          // 显示文章标题
          articleTitle.textContent = `- ${result.data.title || '生成的文章'}`;
          
          // 显示文章内容
          previewContainer.innerHTML = currentArticleHtml;
          
          // 启用下载和复制按钮
          downloadBtn.disabled = false;
          copyBtn.disabled = false;
        } else {
          previewContainer.innerHTML = `<p>${result.data.content || '生成内容不可用'}</p>`;
        }
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('生成文章出错:', error);
      previewContainer.innerHTML = `
        <div class="error-message">
          <h3>生成失败</h3>
          <p>${error.message}</p>
        </div>
      `;
    } finally {
      // 恢复按钮状态
      generateBtn.disabled = false;
      generateBtn.textContent = '生成文章';
      loadingIndicator.style.display = 'none';
    }
  });
  
  // 下载HTML文件
  downloadBtn.addEventListener('click', () => {
    if (!currentArticleHtml) return;
    
    const blob = new Blob([currentArticleHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFilename || 'article.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
  
  // 复制内容到剪贴板
  copyBtn.addEventListener('click', () => {
    if (!currentArticleHtml) return;
    
    navigator.clipboard.writeText(currentArticleHtml)
      .then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '已复制!';
        setTimeout(() => {
          copyBtn.textContent = originalText;
        }, 2000);
      })
      .catch(err => {
        console.error('复制失败:', err);
        alert('复制失败，请手动选择内容并复制');
      });
  });
}); 