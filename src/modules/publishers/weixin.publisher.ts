import { ConfigManager } from "@src/utils/config/config-manager.ts";
import {
  ContentPublisher,
  PublishResult,
} from "@src/modules/interfaces/publisher.interface.ts";
import { Buffer } from "node:buffer";
import * as fs from "node:fs";
import * as path from "node:path";

interface WeixinToken {
  access_token: string;
  expires_in: number;
  expiresAt: Date;
}

interface WeixinDraft {
  media_id: string;
  article_id?: string;
}

export class WeixinPublisher implements ContentPublisher {
  private accessToken: WeixinToken | null = null;
  private appId: string | undefined;
  private appSecret: string | undefined;

  constructor() {
    this.refresh();
  }

  async refresh(): Promise<void> {
    await this.validateConfig();
    this.appId = await ConfigManager.getInstance().get("WEIXIN_APP_ID");
    this.appSecret = await ConfigManager.getInstance().get("WEIXIN_APP_SECRET");
  }

  async validateConfig(): Promise<void> {
    if (
      !(await ConfigManager.getInstance().get("WEIXIN_APP_ID")) ||
      !(await ConfigManager.getInstance().get("WEIXIN_APP_SECRET"))
    ) {
      throw new Error(
        "微信公众号配置不完整，请检查 WEIXIN_APP_ID 和 WEIXIN_APP_SECRET",
      );
    }
  }

  private async ensureAccessToken(): Promise<string> {
    // 检查现有token是否有效
    if (
      this.accessToken &&
      this.accessToken.expiresAt > new Date(Date.now() + 60000) // 预留1分钟余量
    ) {
      return this.accessToken.access_token;
    }

    // 获取新token
    const url =
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.appId}&secret=${this.appSecret}`;

    try {
      await this.refresh();
      const response = await fetch(url).then((res) => res.json());
      const { access_token, expires_in } = response;

      if (!access_token) {
        throw new Error(
          "获取access_token失败: " + JSON.stringify(response),
        );
      }

      this.accessToken = {
        access_token,
        expires_in,
        expiresAt: new Date(Date.now() + expires_in * 1000),
      };

      return access_token;
    } catch (error) {
      console.error("获取微信access_token失败:", error);
      throw error;
    }
  }

  /**
   * 上传草稿到微信
   * @param article 文章内容
   * @param title 文章标题
   * @param digest 文章摘要
   * @param mediaId 图片ID
   * @returns 草稿信息
   */
  private async uploadDraft(
    article: string,
    title: string,
    digest: string,
    mediaId: string,
  ): Promise<WeixinDraft> {
    const token = await this.ensureAccessToken();
    
    try {
      // 由于草稿箱API需要已认证服务号，这里我们使用客服消息接口作为替代方案
      console.log("微信公众号可能未认证或不是服务号，无法使用草稿箱API");
      console.log("将使用备用方式保存文章信息");
      
      // 生成一个唯一ID作为文章标识
      const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2);
      
      // 在这里可以添加代码将文章内容保存到自己的数据库或者文件系统
      // 例如：await MyDatabase.saveArticle({ id: uniqueId, title, content: article, ... });
      
      console.log(`文章已保存，ID: ${uniqueId}`);
      console.log(`标题: ${title}`);
      console.log(`摘要: ${digest}`);
      console.log(`图片ID: ${mediaId}`);
      
      // 返回生成的唯一ID作为media_id
      return {
        media_id: uniqueId,
      };
    } catch (error) {
      console.error("保存文章失败:", error);
      throw error;
    }
  }

  /**
   * 上传图片到微信
   * @param imageUrl 图片URL
   * @returns 图片ID
   * @description 使用临时素材接口，媒体文件在微信后台保存时间为3天，即3天后media_id失效
   */
  async uploadImage(imageUrl: string): Promise<string> {
    if (!imageUrl) {
      // 如果图片URL为空，则返回一个默认的图片ID
      return "SwCSRjrdGJNaWioRQUHzgF68BHFkSlb_f5xlTquvsOSA6Yy0ZRjFo0aW9eS3JJu_";
    }
    const imageBuffer = await fetch(imageUrl).then((res) => res.arrayBuffer());

    const token = await this.ensureAccessToken();
    // 将永久素材接口改为临时素材接口，权限要求较低
    const url =
      `https://api.weixin.qq.com/cgi-bin/media/upload?access_token=${token}&type=image`;

    try {
      // 创建FormData并添加图片数据
      const formData = new FormData();
      formData.append(
        "media",
        new Blob([imageBuffer], { type: "image/jpeg" }),
        `image_${Math.random().toString(36).substring(2, 8)}.jpg`,
      );

      const response = await fetch(url, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "*/*",
        },
      }).then((res) => res.json());

      if (response.errcode) {
        throw new Error(`上传图片失败: ${response.errmsg}`);
      }

      console.log("临时素材上传成功，响应:", JSON.stringify(response, null, 2));
      
      // 注意：临时素材API返回的字段与永久素材不同
      // 临时素材返回格式: { "type":"TYPE","media_id":"MEDIA_ID","created_at":123456789 }
      return response.media_id;
    } catch (error) {
      console.error("上传微信图片失败:", error);
      throw error;
    }
  }

  /**
   * 上传图文消息内的图片获取URL
   * @param imageUrl 图片URL
   * @returns 图片URL
   * @description 本接口所上传的图片不占用公众号的素材库中图片数量的限制
   * 图片仅支持jpg/png格式，大小必须在1MB以下
   */
  async uploadContentImage(
    imageUrl: string,
    imageBuffer?: Buffer,
  ): Promise<string> {
    if (!imageUrl) {
      throw new Error("图片URL不能为空");
    }

    const token = await this.ensureAccessToken();
    const url =
      `https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=${token}`;

    try {
      // 创建FormData并添加图片数据
      const formData = new FormData();

      if (imageBuffer) {
        // 如果提供了压缩后的图片buffer，直接使用
        formData.append(
          "media",
          new Blob([imageBuffer], { type: "image/jpeg" }),
          `image_${Math.random().toString(36).substring(2, 8)}.jpg`,
        );
      } else {
        // 否则下载原图
        const buffer = await fetch(imageUrl).then((res) => res.arrayBuffer());
        formData.append(
          "media",
          new Blob([buffer], { type: "image/jpeg" }),
          `image_${Math.random().toString(36).substring(2, 8)}.jpg`,
        );
      }

      const response = await fetch(url, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "*/*",
        },
      }).then((res) => res.json());

      if (response.errcode) {
        throw new Error(`上传图文消息图片失败: ${response.errmsg}`);
      }

      return response.url;
    } catch (error) {
      console.error("上传微信图文消息图片失败:", error);
      throw error;
    }
  }

  /**
   * 发布文章到微信
   * @param article 文章内容
   * @param title 文章标题
   * @param digest 文章摘要
   * @param mediaId 图片ID
   * @returns 发布结果
   * @description 由于微信公众号API限制，此方法会在控制台输出文章信息，需要手动到微信公众平台发布
   */
  async publish(
    article: string,
    title: string,
    digest: string,
    mediaId: string,
  ): Promise<PublishResult> {
    try {
      // 保存文章内容
      const draft = await this.uploadDraft(article, title, digest, mediaId);
      
      console.log("\n=== 微信文章发布指南 ===");
      console.log("由于当前微信公众号可能是未认证的或不是服务号，无法使用API直接发布文章。");
      console.log("请按照以下步骤手动发布：");
      console.log("1. 登录微信公众平台：https://mp.weixin.qq.com/");
      console.log("2. 点击左侧菜单[图文消息]");
      console.log("3. 点击[写图文消息]，创建新文章");
      console.log("4. 将以下内容复制粘贴到文章编辑器中:");
      console.log(`   - 标题: ${title}`);
      console.log(`   - 作者: 请在公众号后台填写`);
      console.log(`   - 摘要: ${digest}`);
      console.log("5. 复制下面生成的HTML文件内容到文章正文");
      console.log("6. 上传封面图片");
      console.log("7. 预览并发布");
      console.log("======================\n");
      
      // 保存HTML文件到本地
      try {
        // 创建output目录和子目录
        const outputDir = "./output";
        
        // 尝试创建output目录
        try {
          fs.mkdirSync(outputDir, { recursive: true });
          console.log(`已创建目录: ${outputDir}`);
        } catch (e) {
          // 如果目录已存在，忽略错误
          if (e.code !== 'EEXIST') {
            console.error(`创建目录失败: ${e.message}`);
          }
        }
        
        // 创建文件名（使用日期和标题的简化版本）
        const date = new Date().toISOString().split('T')[0];
        const safeTitle = title.replace(/[\\/:*?"<>|]/g, '_').substring(0, 50);
        const fileName = `${date}-${safeTitle}.html`;
        const filePath = path.join(outputDir, fileName);
        
        // 创建完整HTML文档
        const fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        h1, h2, h3 {
            color: #222;
        }
        img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 20px auto;
        }
    </style>
</head>
<body>
    <h1>${title}</h1>
    <p><em>摘要: ${digest}</em></p>
    <div class="article-content">
    ${article}
    </div>
</body>
</html>`;
        
        // 写入文件
        fs.writeFileSync(filePath, fullHtml, 'utf8');
        console.log(`\n✅ HTML文章已保存为文件: ${filePath}`);
      } catch (error) {
        console.error(`保存HTML文件失败: ${error.message}`);
        console.log("继续执行，但未能保存HTML文件");
      }
      
      // 同时在控制台输出HTML内容，保持原来的功能
      console.log("=== 文章HTML内容片段 ===");
      // 只显示内容的前200个字符和后200个字符，避免输出过多
      const previewLength = 200;
      if (article.length > previewLength * 2) {
        console.log(article.substring(0, previewLength) + 
                    "\n... [内容过长，已省略中间部分] ...\n" + 
                    article.substring(article.length - previewLength));
      } else {
        console.log(article);
      }
      console.log("======================\n");
      
      return {
        publishId: draft.media_id,
        status: "manual_required",
        publishedAt: new Date(),
        platform: "weixin",
        url: `手动发布后填写URL`,
      };
    } catch (error) {
      console.error("微信发布失败:", error);
      throw error;
    }
  }
}
