import { MySQLDB } from "../utils/db/mysql.db.ts";

async function testDatabaseConnection() {
  console.log("测试数据库连接...");
  try {
    // 获取配置信息
    const dbConfig = {
      host: "localhost",
      port: 3306,
      user: "root",
      password: "password",
      database: "trendfinder"
    };
    
    // 获取数据库实例
    const db = await MySQLDB.getInstance(dbConfig);
    console.log("数据库连接成功!");
    
    // 测试查询
    try {
      const rows = await db.query("SHOW TABLES;");
      console.log("数据库中的表:");
      console.log(rows);
    } catch (error) {
      console.log("查询表失败，可能是因为数据库中还没有表:", error);
    }
    
    // 关闭连接
    await db.close();
    console.log("数据库连接已关闭");
  } catch (error) {
    console.error("数据库连接失败:");
    console.error(error);
  }
}

// 执行测试
testDatabaseConnection(); 