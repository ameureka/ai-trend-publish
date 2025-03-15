import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { WeixinArticleWorkflow } from "./src/services/weixin-article.workflow.ts";
import { ensureDirSync } from "https://deno.land/std/fs/mod.ts";

// 确保输出目录存在
ensureDirSync("./output");
ensureDirSync("./public");

const app = new Application();
const router = new Router();

// API端点 - 生成文章
router.post("/api/generate", async (ctx) => {
  try {
    const body = await ctx.request.body({ type: "json" }).value;
    console.log("接收到生成请求:", body);
    
    const workflow = new WeixinArticleWorkflow({});
    const result = await workflow.run(
      { payload: { sourceType: "all", maxArticles: 5, forcePublish: false } },
      { do: async (name, options, fn) => fn ? await fn() : await options() }
    );
    
    ctx.response.body = {
      success: true,
      message: "文章生成成功",
      data: {
        filePath: result?.outputFilePath || "",
        title: result?.title || "生成的文章",
        content: result?.content || ""
      }
    };
  } catch (error) {
    console.error("生成文章时出错:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: `生成失败: ${error.message}`,
    };
  }
});

// API端点 - 获取生成的文章
router.get("/api/articles/:filename", async (ctx) => {
  try {
    const filename = ctx.params.filename;
    const content = await Deno.readTextFile(`./output/${filename}`);
    ctx.response.body = { content };
  } catch (error) {
    ctx.response.status = 404;
    ctx.response.body = { error: "文件未找到" };
  }
});

// 静态文件服务
app.use(async (ctx, next) => {
  try {
    await ctx.send({
      root: `${Deno.cwd()}/public`,
      index: "index.html",
    });
  } catch {
    await next();
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

console.log("服务器启动在 http://localhost:8000");
await app.listen({ port: 8000 }); 