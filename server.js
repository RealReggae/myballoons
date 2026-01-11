import express from "express";
import cors from "cors";
import axios from "axios";
import Database from "better-sqlite3";
import dotenv from 'dotenv';

const app = express();
const PORT = 3000;

const db = new Database("./db/myballoons.db");

dotenv.config();

const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TG_API = `https://api.telegram.org/bot${TOKEN}`;

app.use(express.json());
app.use(cors( {origin: "https://test.myballoons.by" } ));
app.use("/public", express.static("public"));

app.get("/api", (req, res) => {
    const category = req.query.category;
    const rows = db.prepare("SELECT * FROM catalog WHERE category = ?").all(category);
    res.send(rows);
});

app.get("/api/catalog/:category/:id", (req, res) => {
    const { category, id } = req.params;
    const item = db.prepare("SELECT * FROM catalog WHERE category = ? AND id = ?").get(category, id);

    if (item) {
        res.send(item);
    } else {
        res.status(404).send({ error: "Товар не найден" });
    }
});

app.post("/orders", async (req, res) => {
    const data = req.body;

    const tempSql = db.prepare("INSERT INTO orders (delivery_type, customers_name, customers_phone, order_date, order_time, order_address, product_title, product_price, product_category ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");

    const info = tempSql.run(data.delivery_type, 
        data.customers_name, 
        data.customers_phone, 
        data.order_date, 
        data.order_time, 
        data.order_address, 
        data.product_title, 
        data.product_price, 
        data.product_category );

    const deliveryText = data.delivery_type === "delivery" ? "Доставка" : "Самовывоз";

    const msg = `📝<b>Новый заказ</b> 
    Имя: ${data.customers_name} 
    Телефон: ${data.customers_phone} 
    Доставка: ${deliveryText}
    Адрес: ${data.order_address} 
    Дата: ${data.order_date} ${data.order_time} 
    Набор: ${data.product_title} (${data.product_category}) 
    Цена: ${data.product_price} BYN `;

    try { 
        await axios.post(`${TG_API}/sendMessage`, { 
            chat_id: CHAT_ID, text: msg, parse_mode: "HTML" }); 
            res.send("SUCCESS + Telegram!"); } 
    catch (err) { 
    console.error("Telegram error:", err?.response?.data || err.message); 
    res.send("SUCCESS, но Telegram не отправил"); }
});

app.delete("/:id", (req, res) => {
    const { id } = req.params;

    const tempSql = db.prepare("DELETE FROM catalog WHERE id = ?");

    const info = tempSql.run(id);

    if (info.changes > 0) {
        res.send(`Товар с id=${id} удалён успешно`)
    } else {
        res.send(`Товар с id=${id} не найдён`)
    };
});

app.put("/:id", (req,res) => {
    const { id } = req.params;
    const { name, price, description, link } = req.body;

    const tempSql = db.prepare("UPDATE catalog SET name = ?, price = ?, description = ?, link = ? WHERE id = ? ");

    const info = tempSql.run(name, price, description, link, id);

    if(info.changes > 0) {
        res.send(`Товар с id=${id} обновлён`)
    } else {
        res.send(`Товар с таким ${id} не найден`)
    };

});

app.listen(PORT, () => {
    console.log(`I'm on port: ${PORT}`)

});
