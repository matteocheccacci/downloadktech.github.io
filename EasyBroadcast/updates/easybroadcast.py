import json
import os
import tkinter as tk
from tkinter import ttk, messagebox, simpledialog
from telegram import Bot
from telegram.error import TelegramError
import asyncio
from PIL import Image, ImageTk
import requests
import shutil
from datetime import datetime
import markdown

# ---------- File Names ----------
CONFIG_FILE = "config.json"
SETTINGS_FILE = "settings.json"
DRAFT_FILE = "draft.json"
HISTORY_FILE = "history.json"
LOG_FILE = "log.txt"

#---------- Software Info ----------
SOFTWARE_VERSION = "1.1.8"
SOFTWARE_VERSION_STR = f"{SOFTWARE_VERSION}"

# ---------- Utility Functions ----------
def load_json(filename, default):
    """Carica un file JSON, gestendo errori e file mancanti."""
    if os.path.exists(filename):
        try:
            with open(filename, "r", encoding="utf-8") as f:
                return json.load(f)
        except json.JSONDecodeError:
            print(f"Errore: Il file '{filename}' è corrotto. Verranno utilizzati i dati predefiniti.")
            return default
    return default

def save_json(filename, data):
    """Salva i dati in un file JSON con formattazione leggibile."""
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def parse_version(v_str):
    """Converte una stringa di versione x.x.x in una tupla (x, x, x)."""
    try:
        # Pulisce la stringa rimuovendo il prefisso, se presente
        v_str = v_str.split('-')[-1]
        nums = v_str.split(".")
        return tuple(int(n) for n in nums)
    except Exception:
        return (0, 0, 0)

def escape_markdown_v2(text):
    """
    Esegue l'escape dei caratteri speciali per il formato MarkdownV2 di Telegram.
    I caratteri speciali da escapare sono: `_`, `*`, `[`, `]`, `(`, `)`, `~`, `~`, `>`, `#`, `+`, `-`, `=`, `|`, `{`, `}`, `.`, `!`.
    """
    special_chars = r'_*[]()~`>#+-=|{}.!'
    return "".join(f"\\{c}" if c in special_chars else c for c in text)

# Temporary mock for HTMLLabel to prevent errors if the user doesn't have it
try:
    from tkhtmlview import HTMLLabel
except ImportError:
    class HTMLLabel(tk.Text):
        def __init__(self, master=None, html="", **kw):
            super().__init__(master, **kw)
            self.insert(tk.END, "HTML support not available. Please install tkhtmlview.")
            self.config(state="disabled")

# ---------- GUI Class ----------
class EBGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("EasyBroadcast for Telegram Bots")
        self.root.geometry("750x700")

        self.config = load_json(CONFIG_FILE, {"BOT_TOKEN": "", "CHAT_LIST": {}})
        self.settings = load_json(SETTINGS_FILE, {
            "SIGNATURES": [],
            "EMOJIS": ["👍", "🎉", "🔥", "🚀", "💡", "✅", "❌"],
            "UPDATE_SERVER": "downloads.kekkotech.com",
            "SERVICE_ID": "EasyBroadcast",
            "isFirstOpen": True
        })
        
        # Initialize the bot here
        self.bot = None
        self.init_bot()

        # MODIFICATO: Corretta l'integrazione tra asyncio e tkinter
        # 1. Creiamo un nuovo event loop per asyncio
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        
        # 2. Avviamo il nostro gestore del loop dopo 1ms
        self.root.after(1, self.run_asyncio_loop)

        if self.settings.get("isFirstOpen", True):
            # L'OOBE utilizza il loop in modo bloccante, il che va bene
            # perché non c'è ancora una GUI interattiva.
            self.run_oobe()
        else:
            self.init_normal_gui()

    # MODIFICATO: Questa funzione ora integra correttamente il loop asyncio con il mainloop di tkinter
    def run_asyncio_loop(self):
        """
        Esegue una singola "iterazione" del loop asyncio e poi si ri-schedula
        tramite il loop di tkinter. Questo permette ai due loop di coesistere.
        """
        # Esegui tutti i task pronti in asyncio
        self.loop.stop()
        self.loop.run_forever()

        # Ri-schedula l'esecuzione di questo metodo attraverso tkinter
        self.root.after(1, self.run_asyncio_loop)

    # RIMOSSO: Il metodo poll_tasks non è più necessario
    # async def poll_tasks(self):
    #     ...

    # ---------- OOBE - Out of Box Experience ----------
    def run_oobe(self):
        messagebox.showinfo("Benvenuto", "Benvenuto in EasyBroadcast!\n\nConfiguriamo insieme il tuo bot passo passo.")

        token = simpledialog.askstring("Token Bot", "Inserisci il token del bot (da BotFather):")
        if not token:
            self.root.quit()
            return
        
        try:
            self.bot = Bot(token=token)
            # Usiamo il loop che abbiamo creato per eseguire il task bloccante
            self.loop.run_until_complete(self.bot.get_me())
        except TelegramError as e:
            messagebox.showerror("Errore", f"Token non valido:\n{e}")
            self.root.quit()
            return
        except Exception as e:
            messagebox.showerror("Errore", f"Errore generico:\n{e}")
            self.root.quit()
            return

        self.config["BOT_TOKEN"] = token
        save_json(CONFIG_FILE, self.config)

        messagebox.showinfo("Azione richiesta", "Ora aggiungi il bot a un gruppo o inviagli un messaggio privato,\npoi premi OK per rilevare la chat.")

        try:
            updates = self.loop.run_until_complete(self.bot.get_updates(timeout=10))
            if not updates:
                messagebox.showerror("Errore", "Nessuna chat trovata. Scrivi un messaggio al bot e riprova.")
                self.root.quit()
                return
            chat_id = updates[-1].message.chat.id
            chat_name = simpledialog.askstring("Nome Chat", f"Trovata chat con ID {chat_id}.\nCome vuoi chiamarla?")
            if not chat_name:
                chat_name = f"Chat_{chat_id}"
            self.config["CHAT_LIST"][chat_name] = str(chat_id)
            save_json(CONFIG_FILE, self.config)
        except Exception as e:
            messagebox.showerror("Errore", f"Non riesco a recuperare chat:\n{e}")
            self.root.quit()
            return

        sig = simpledialog.askstring("Firma predefinita", "Inserisci una firma iniziale (opzionale):")
        if sig:
            self.settings["SIGNATURES"].append(sig)
        emoji = simpledialog.askstring("Emoji extra", "Vuoi aggiungere un'emoji personalizzata?")
        if emoji:
            self.settings["EMOJIS"].append(emoji)

        self.settings["isFirstOpen"] = False
        save_json(SETTINGS_FILE, self.settings)

        messagebox.showinfo("Completato", "Configurazione completata!\nOra puoi usare EasyBroadcast.")
        self.init_normal_gui()

    # ---------- Normal GUI Initialization ----------
    def init_normal_gui(self):
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill="both", expand=True)

        self.create_tab_messages()
        self.create_tab_drafts()
        self.create_tab_history()
        self.create_tab_settings()
        self.create_tab_info()
        self.create_tab_whats_new()
        self.load_draft()

    def init_bot(self):
        token = self.config.get("BOT_TOKEN", "")
        if token:
            self.bot = Bot(token=token)
        else:
            self.bot = None

    # ---------- Tab Creation Methods ----------
    def create_tab_messages(self):
        self.tab_messages = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_messages, text="Messaggi")
        frame = ttk.Frame(self.tab_messages, padding=10)
        frame.pack(fill="both", expand=True)

        frame.grid_columnconfigure(0, weight=1)
        frame.grid_rowconfigure(7, weight=1)

        ttk.Label(frame, text="Titolo Messaggio:", font=("Frutiger", 12, "bold")).grid(row=0, column=0, sticky="w")
        self.title_entry = ttk.Entry(frame, width=60)
        self.title_entry.grid(row=1, column=0, pady=5, sticky="ew")

        try:
            img = Image.open("logo.png")
            img.thumbnail((170, 80), Image.Resampling.LANCZOS)
            self.logo_image = ImageTk.PhotoImage(img)
            ttk.Label(frame, image=self.logo_image).grid(row=0, column=1, sticky="e", rowspan=2)
        except FileNotFoundError:
            pass

        ttk.Label(frame, text="Seleziona Chat:", font=("Frutiger", 12, "bold")).grid(row=2, column=0, sticky="w")
        self.chat_combo = ttk.Combobox(frame, values=list(self.config.get("CHAT_LIST", {}).keys()), state="readonly", width=30)
        self.chat_combo.grid(row=3, column=0, pady=5, sticky="w")
        if self.chat_combo['values']:
            self.chat_combo.current(0)

        ttk.Label(frame, text="Categoria:", font=("Frutiger", 12, "bold")).grid(row=4, column=0, sticky="w")
        self.category_options = ["Territoriale: 🔴⚪️", "Regionale: 🟢🔵", "Nazionale: 🇮🇹", "Lutto: ⚫"]
        self.category_combo = ttk.Combobox(frame, values=self.category_options, state="readonly", width=30)
        self.category_combo.grid(row=5, column=0, pady=5, sticky="w")
        self.category_combo.current(0)

        ttk.Label(frame, text="Corpo del Messaggio:", font=("Frutiger", 12, "bold")).grid(row=6, column=0, sticky="w")
        
        body_text_frame = ttk.Frame(frame)
        body_text_frame.grid(row=7, column=0, sticky="nsew", pady=5)
        body_text_frame.grid_columnconfigure(0, weight=1)
        body_text_frame.grid_rowconfigure(0, weight=1)
        
        self.body_text = tk.Text(body_text_frame, height=12, width=60, font=("Frutiger", 11), wrap="none")
        self.body_text.grid(row=0, column=0, sticky="nsew")

        v_scrollbar = ttk.Scrollbar(body_text_frame, orient="vertical", command=self.body_text.yview)
        v_scrollbar.grid(row=0, column=1, sticky="ns")
        h_scrollbar = ttk.Scrollbar(body_text_frame, orient="horizontal", command=self.body_text.xview)
        h_scrollbar.grid(row=1, column=0, sticky="ew")

        self.body_text.config(yscrollcommand=v_scrollbar.set, xscrollcommand=h_scrollbar.set)

        self.emoji_frame = ttk.Frame(frame)
        self.emoji_frame.grid(row=7, column=1, sticky="nw", padx=5)
        self.update_emoji_buttons()

        ttk.Label(frame, text="Firma:", font=("Frutiger", 12, "bold")).grid(row=8, column=0, sticky="w")
        self.signature_combo = ttk.Combobox(frame, state="readonly", width=30)
        self.signature_combo.grid(row=9, column=0, pady=5, sticky="w")
        self.signature_combo.bind("<<ComboboxSelected>>", self.toggle_other_signature_field)
        self.update_signature_combobox()

        self.other_signature_frame = ttk.Frame(frame)
        self.other_signature_label = ttk.Label(self.other_signature_frame, text="Inserisci firma:")
        self.other_signature_entry = ttk.Entry(self.other_signature_frame, width=30)

        btn_frame = ttk.Frame(frame)
        btn_frame.grid(row=10, column=0, columnspan=2, pady=10)
        ttk.Button(btn_frame, text="Anteprima Messaggio", command=self.preview_message).pack(side="left", padx=5)
        ttk.Button(btn_frame, text="Salva Bozza", command=self.save_draft).pack(side="left", padx=5)
        ttk.Button(btn_frame, text="Invia Messaggio", command=self.send_message).pack(side="left", padx=5)

        self.status_label = ttk.Label(frame, text="", font=("Frutiger", 10, "italic"))
        self.status_label.grid(row=11, column=0, columnspan=2)

    def create_tab_drafts(self):
        self.tab_drafts = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_drafts, text="Bozze")
        frame = ttk.Frame(self.tab_drafts, padding=10)
        frame.pack(fill="both", expand=True)

        ttk.Label(frame, text="Bozze Salvate:", font=("Frutiger", 12, "bold")).pack(anchor="w")
        self.draft_listbox = tk.Listbox(frame, height=15)
        self.draft_listbox.pack(fill="both", expand=True, pady=5)

        btn_frame = ttk.Frame(frame)
        btn_frame.pack(pady=5)
        ttk.Button(btn_frame, text="Carica Bozza Selezionata", command=self.load_selected_draft).pack(side="left", padx=5)
        ttk.Button(btn_frame, text="Elimina Bozza Selezionata", command=self.delete_selected_draft).pack(side="left", padx=5)

        self.refresh_draft_list()
    
    def create_tab_history(self):
        self.tab_history = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_history, text="Cronologia")
        frame = ttk.Frame(self.tab_history, padding=10)
        frame.pack(fill="both", expand=True)

        ttk.Label(frame, text="Messaggi Inviati:", font=("Frutiger", 12, "bold")).pack(anchor="w")
        self.log_listbox = tk.Listbox(frame, height=20)
        self.log_listbox.pack(fill="both", expand=True, pady=5)
        self.refresh_history()

    def create_tab_settings(self):
        self.tab_settings = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_settings, text="Impostazioni")
        frame = ttk.Frame(self.tab_settings, padding=10)
        frame.pack(fill="both", expand=True)

        frame.grid_columnconfigure(0, weight=1)
        frame.grid_columnconfigure(1, weight=1)

        ttk.Label(frame, text="Bot Token:", font=("Frutiger", 12, "bold")).grid(row=0, column=0, sticky="w")
        self.token_entry = ttk.Entry(frame, width=60)
        self.token_entry.grid(row=1, column=0, pady=5, sticky="ew")
        self.token_entry.insert(0, self.config.get("BOT_TOKEN", ""))

        ttk.Label(frame, text="Lista Chat:", font=("Frutiger", 12, "bold")).grid(row=2, column=0, sticky="w")
        self.chat_listbox = tk.Listbox(frame, height=8)
        self.chat_listbox.grid(row=3, column=0, sticky="ew", pady=5)
        for chat_name, chat_id in self.config.get("CHAT_LIST", {}).items():
            self.chat_listbox.insert("end", f"{chat_name} -> {chat_id}")

        chat_btn_frame = ttk.Frame(frame)
        chat_btn_frame.grid(row=4, column=0, pady=5, sticky="w")
        ttk.Button(chat_btn_frame, text="Aggiungi Chat", command=self.add_chat).pack(side="left", padx=5)
        ttk.Button(chat_btn_frame, text="Modifica Chat", command=self.edit_chat).pack(side="left", padx=5)
        ttk.Button(chat_btn_frame, text="Rimuovi Chat", command=self.remove_chat).pack(side="left", padx=5)

        ttk.Label(frame, text="Firme Predefinite:", font=("Frutiger", 12, "bold")).grid(row=5, column=0, sticky="w", pady=(10, 0))
        self.sign_listbox = tk.Listbox(frame, height=6)
        self.sign_listbox.grid(row=6, column=0, sticky="ew", pady=5)
        for s in self.settings.get("SIGNATURES", []):
            self.sign_listbox.insert("end", s)

        sign_btn_frame = ttk.Frame(frame)
        sign_btn_frame.grid(row=7, column=0, pady=5, sticky="w")
        ttk.Button(sign_btn_frame, text="Aggiungi Firma", command=self.add_signature).pack(side="left", padx=5)
        ttk.Button(sign_btn_frame, text="Rimuovi Firma", command=self.remove_signature).pack(side="left", padx=5)

        ttk.Label(frame, text="Emoji Predefinite:", font=("Frutiger", 12, "bold")).grid(row=8, column=0, sticky="w", pady=(10, 0))
        self.emoji_listbox = tk.Listbox(frame, height=4)
        self.emoji_listbox.grid(row=9, column=0, sticky="ew", pady=5)
        for e in self.settings.get("EMOJIS", []):
            self.emoji_listbox.insert("end", e)

        emoji_btn_frame = ttk.Frame(frame)
        emoji_btn_frame.grid(row=10, column=0, pady=5, sticky="w")
        ttk.Button(emoji_btn_frame, text="Aggiungi Emoji", command=self.add_emoji).pack(side="left", padx=5)
        ttk.Button(emoji_btn_frame, text="Rimuovi Emoji", command=self.remove_emoji).pack(side="left", padx=5)

        ttk.Label(frame, text="Update Server:", font=("Frutiger", 12, "bold")).grid(row=0, column=1, sticky="w", padx=(10, 0))
        self.update_server_entry = ttk.Entry(frame, width=60)
        self.update_server_entry.grid(row=1, column=1, pady=5, sticky="ew", padx=(10, 0))
        self.update_server_entry.insert(0, self.settings.get("UPDATE_SERVER", ""))

        ttk.Label(frame, text="Service ID:", font=("Frutiger", 12, "bold")).grid(row=2, column=1, sticky="w", padx=(10, 0))
        self.service_id_entry = ttk.Entry(frame, width=60)
        self.service_id_entry.grid(row=3, column=1, pady=5, sticky="ew", padx=(10, 0))
        self.service_id_entry.insert(0, self.settings.get("SERVICE_ID", ""))

        ttk.Button(frame, text="Controllo Aggiornamenti", command=self.check_update).grid(row=4, column=1, pady=10, sticky="w", padx=(10, 0))
        ttk.Button(frame, text="Salva Impostazioni", command=self.save_settings).grid(row=5, column=1, pady=10, sticky="w", padx=(10, 0))

    def create_tab_info(self):
        self.tab_info = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_info, text="Info")
        frame = ttk.Frame(self.tab_info, padding=10)
        frame.pack(fill="both", expand=True)

        ttk.Label(frame, text=f"Copyright (C) 2025 KekkoTech Softwares - Italia", font=("Frutiger", 12, "bold")).pack(anchor="w", pady=5)
        ttk.Label(frame, text=f"Per feedback: feedback@kekkotech.it", font=("Frutiger", 12)).pack(anchor="w", pady=5)
        ttk.Label(frame, text=f"Per ricevere supporto: support@kekkotech.it", font=("Frutiger", 12)).pack(anchor="w", pady=5)
        ttk.Label(frame, text=f"\nInformazioni Software:", font=("Frutiger", 16, "bold")).pack(anchor="w", pady=5)
        ttk.Label(frame, text=f"Versione Corrente: {SOFTWARE_VERSION_STR}", font=("Frutiger", 12)).pack(anchor="w", pady=5)
        update_server = self.settings.get("UPDATE_SERVER", "Non impostato")
        service_id = self.settings.get("SERVICE_ID", "Non impostato")
        ttk.Label(frame, text=f"Update Server: {update_server}", font=("Frutiger", 12)).pack(anchor="w", pady=5)
        ttk.Label(frame, text=f"Service ID: {service_id}", font=("Frutiger", 12)).pack(anchor="w", pady=5)
        ttk.Label(frame, text=f"\nInformazioni Default:", font=("Frutiger", 16, "bold")).pack(anchor="w", pady=5)
        ttk.Label(frame, text=f"Default Update Server: downloads.kekkotech.com", font=("Frutiger", 12)).pack(anchor="w", pady=5)
        ttk.Label(frame, text=f"Default Settings: https://downloads.kekkotech.com/EasyBroadcast/install/settings.json", font=("Frutiger", 12)).pack(anchor="w", pady=5)
        ttk.Label(frame, text=f"Default Drafts File: https://downloads.kekkotech.com/EasyBroadcast/install/draft.json", font=("Frutiger", 12)).pack(anchor="w", pady=5)
        ttk.Label(frame, text=f"Default Config File: https://downloads.kekkotech.com/EasyBroadcast/install/config.json", font=("Frutiger", 12)).pack(anchor="w", pady=5)
        ttk.Label(frame, text=f"Default Log File: https://downloads.kekkotech.com/EasyBroadcast/install/log.txt", font=("Frutiger", 12)).pack(anchor="w", pady=5)

    # ---------- What's New Tab ----------
    def create_tab_whats_new(self):
        self.tab_whats_new = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_whats_new, text="Novità")

        whats_new_url = f"https://{self.settings.get('UPDATE_SERVER', 'downloads.kekkotech.com')}/{self.settings.get('SERVICE_ID', 'EasyBroadcast')}/updates/updtnotes.md"
        
        try:
            response = requests.get(whats_new_url)
            response.raise_for_status()
            md_content = response.text
            html_content = markdown.markdown(md_content)

            html_label = HTMLLabel(self.tab_whats_new, html=html_content)
            html_label.pack(fill="both", expand=True, padx=10, pady=10)

        except requests.exceptions.RequestException as e:
            error_message = f"Errore durante il recupero delle novità:\n{e}"
            error_label = ttk.Label(self.tab_whats_new, text=error_message, foreground="red")
            error_label.pack(fill="both", expand=True, padx=10, pady=10)
        except Exception as e:
            error_message = f"Errore generico: {e}"
            error_label = ttk.Label(self.tab_whats_new, text=error_message, foreground="red")
            error_label.pack(fill="both", expand=True, padx=10, pady=10)

    # ---------- Drafts and History Methods ----------
    def refresh_draft_list(self):
        self.draft_listbox.delete(0, "end")
        drafts = load_json(DRAFT_FILE, [])
        if isinstance(drafts, list):
            for i, d in enumerate(drafts):
                self.draft_listbox.insert("end", f"{i+1} - {d.get('title', 'Senza titolo')}")

    def delete_selected_draft(self):
        sel = self.draft_listbox.curselection()
        if not sel: return
        idx = sel[0]
        drafts = load_json(DRAFT_FILE, [])
        if isinstance(drafts, list) and len(drafts) > idx:
            drafts.pop(idx)
            save_json(DRAFT_FILE, drafts)
            self.refresh_draft_list()
            messagebox.showinfo("Bozza", "Bozza eliminata correttamente!")

    def save_draft(self):
        draft = {
            "title": self.title_entry.get(),
            "body": self.body_text.get("1.0", "end-1c"),
            "signature": self.other_signature_entry.get() if self.signature_combo.get() == "Altro" else self.signature_combo.get(),
            "category": self.category_combo.get(),
            "chat": self.chat_combo.get()
        }
        drafts = load_json(DRAFT_FILE, [])
        if not isinstance(drafts, list):
            drafts = [drafts] if drafts else []
        drafts.append(draft)
        save_json(DRAFT_FILE, drafts)
        self.refresh_draft_list()
        messagebox.showinfo("Bozza", "Bozza salvata correttamente!")

    def load_draft(self):
        drafts = load_json(DRAFT_FILE, [])
        if isinstance(drafts, list) and drafts:
            d = drafts[-1]
            self.load_message_data(d)
        
    def load_selected_draft(self):
        sel = self.draft_listbox.curselection()
        if not sel: return
        idx = sel[0]
        drafts = load_json(DRAFT_FILE, [])
        if isinstance(drafts, list) and len(drafts) > idx:
            d = drafts[idx]
            self.load_message_data(d)
            self.notebook.select(self.tab_messages) # Switch to messages tab

    def load_message_data(self, d):
        self.title_entry.delete(0, "end")
        self.title_entry.insert(0, d.get("title", ""))
        self.body_text.delete("1.0", "end")
        self.body_text.insert("1.0", d.get("body", ""))
        
        cat = d.get("category", "")
        if cat in self.category_options:
            self.category_combo.set(cat)
        
        chat = d.get("chat", "")
        if chat in self.config.get("CHAT_LIST", {}):
            self.chat_combo.set(chat)
        
        sig = d.get("signature", "")
        if sig in self.settings.get("SIGNATURES", []):
            self.signature_combo.set(sig)
        else:
            self.signature_combo.set("Altro")
            self.toggle_other_signature_field(None)
            self.other_signature_entry.delete(0, "end")
            self.other_signature_entry.insert(0, sig)

    def refresh_history(self):
        self.log_listbox.delete(0, "end")
        if os.path.exists(LOG_FILE):
            with open(LOG_FILE, "r", encoding="utf-8") as f:
                # Legge le linee e le inverte per mostrare le più recenti in alto
                lines = f.read().strip().split("\n\n")
            
            for l in reversed(lines):
                l_stripped = l.strip()
                if l_stripped:
                    if " -> " in l_stripped:
                        parts = l_stripped.split(" -> ", 1)
                        timestamp = parts[0].strip()
                        message_preview = parts[1].strip().replace('\n', ' ')
                        if len(message_preview) > 80:
                            message_preview = message_preview[:80] + "..."
                        self.log_listbox.insert("end", f"{timestamp} -> {message_preview}")
                    else:
                        self.log_listbox.insert("end", l_stripped)

    # ---------- Settings Management Methods ----------
    def toggle_other_signature_field(self, event):
        if self.signature_combo.get() == "Altro":
            self.other_signature_frame.grid(row=9, column=1, sticky="w", pady=5, padx=5)
            self.other_signature_label.pack(side="left")
            self.other_signature_entry.pack(side="left")
        else:
            self.other_signature_frame.grid_forget()

    def update_signature_combobox(self):
        values = self.settings.get("SIGNATURES", []) + ["Altro"]
        self.signature_combo['values'] = values
        if values:
            self.signature_combo.current(0)

    def update_emoji_buttons(self):
        for widget in self.emoji_frame.winfo_children():
            widget.destroy()
        
        emojis = self.settings.get("EMOJIS", [])
        for emoji in emojis:
            ttk.Button(self.emoji_frame, text=emoji, command=lambda e=emoji: self.insert_emoji(e), width=3).pack(side="top", pady=2, padx=2)

    def add_emoji(self):
        emoji = simpledialog.askstring("Aggiungi Emoji", "Inserisci l'emoji:")
        if emoji:
            self.settings["EMOJIS"].append(emoji)
            self.update_emoji_buttons()
            self.emoji_listbox.insert("end", emoji)

    def remove_emoji(self):
        sel = self.emoji_listbox.curselection()
        if sel:
            emoji_to_remove = self.emoji_listbox.get(sel[0])
            if emoji_to_remove in self.settings["EMOJIS"]:
                self.settings["EMOJIS"].remove(emoji_to_remove)
                self.emoji_listbox.delete(sel[0])
                self.update_emoji_buttons()

    def insert_emoji(self, emoji):
        self.body_text.insert(tk.INSERT, emoji)

    def add_chat(self):
        name = simpledialog.askstring("Aggiungi Chat", "Nome Chat:")
        if not name: return
        chat_id = simpledialog.askstring("Aggiungi Chat", "ID Chat:")
        if not chat_id: return
        self.chat_listbox.insert("end", f"{name} -> {chat_id}")

    def edit_chat(self):
        sel = self.chat_listbox.curselection()
        if not sel: return
        idx = sel[0]
        old = self.chat_listbox.get(idx)
        name, chat_id = old.split(" -> ")
        new_name = simpledialog.askstring("Modifica Chat", "Nome Chat:", initialvalue=name)
        if not new_name: return
        new_id = simpledialog.askstring("Modifica Chat", "ID Chat:", initialvalue=chat_id)
        if not new_id: return
        self.chat_listbox.delete(idx)
        self.chat_listbox.insert(idx, f"{new_name} -> {new_id}")

    def remove_chat(self):
        sel = self.chat_listbox.curselection()
        if sel: self.chat_listbox.delete(sel[0])

    def add_signature(self):
        sig = simpledialog.askstring("Aggiungi Firma", "Nome Firma:")
        if sig:
            self.sign_listbox.insert("end", sig)

    def remove_signature(self):
        sel = self.sign_listbox.curselection()
        if sel: self.sign_listbox.delete(sel[0])

    def save_settings(self):
        self.config["BOT_TOKEN"] = self.token_entry.get().strip()
        chat_dict = {}
        for i in range(self.chat_listbox.size()):
            try:
                name, id_ = self.chat_listbox.get(i).split(" -> ")
                chat_dict[name] = id_.strip()
            except ValueError:
                messagebox.showwarning("Errore", f"Il formato della chat '{self.chat_listbox.get(i)}' non è valido. Deve essere 'Nome -> ID'.")
                return

        self.config["CHAT_LIST"] = chat_dict
        save_json(CONFIG_FILE, self.config)

        sigs = [self.sign_listbox.get(i) for i in range(self.sign_listbox.size())]
        self.settings["SIGNATURES"] = sigs

        emojis = [self.emoji_listbox.get(i) for i in range(self.emoji_listbox.size())]
        self.settings["EMOJIS"] = emojis

        self.settings["UPDATE_SERVER"] = self.update_server_entry.get().strip()
        self.settings["SERVICE_ID"] = self.service_id_entry.get().strip()
        save_json(SETTINGS_FILE, self.settings)

        self.init_bot()
        self.update_signature_combobox()
        self.chat_combo['values'] = list(self.config.get("CHAT_LIST",{}).keys())
        if self.chat_combo['values']:
            self.chat_combo.current(0)
        messagebox.showinfo("Impostazioni", "Salvate correttamente!")

    # ---------- Update Check Methods ----------
    def check_update(self):
        # MODIFIED: Uses create_task instead of asyncio.run to avoid creating a new loop
        self.loop.create_task(self._check_update_async())
    
    async def _check_update_async(self):
        server = self.update_server_entry.get().strip()
        service = self.service_id_entry.get().strip()
        if not server or not service:
            messagebox.showwarning("Controllo Aggiornamenti", "Inserisci Update Server e Service ID!")
            return

        version_url = f"https://{server}/{service}/updates/version.txt"
        script_url = f"https://{server}/{service}/updates/easybroadcast.py"

        try:
            self.status_label.config(text=f"Controllo versione da {version_url}...", foreground="blue")
            r = await self.loop.run_in_executor(None, lambda: requests.get(version_url, timeout=10))
            r.raise_for_status()
            server_version = r.text.strip()

            if parse_version(server_version) <= parse_version(SOFTWARE_VERSION_STR):
                messagebox.showinfo("Controllo Aggiornamenti", f"Versione corrente ({SOFTWARE_VERSION_STR}) già aggiornata.")
                self.status_label.config(text="")
                return

            if not messagebox.askyesno("Aggiornamento Disponibile", f"Nuova versione trovata: {server_version}\nVuoi scaricarla ora?"):
                self.status_label.config(text="")
                return
            
            self.status_label.config(text=f"Download aggiornamento da {script_url}...", foreground="blue")
            r = await self.loop.run_in_executor(None, lambda: requests.get(script_url, timeout=30))
            r.raise_for_status()

            current_script_name = os.path.basename(__file__)
            if os.path.exists(current_script_name):
                backup_name = f"{current_script_name.replace('.py', '')}_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.py"
                shutil.copy(current_script_name, backup_name)
            
            with open(current_script_name, "wb") as f:
                f.write(r.content)
            
            self.status_label.config(text="")
            messagebox.showinfo("Controllo Aggiornamenti",
                                  f"Aggiornamento scaricato!\nVersione aggiornata: {server_version}\nIl backup della vecchia versione è stato salvato.\n\nRiavvia l'applicazione per applicare le modifiche.")
        except Exception as e:
            messagebox.showerror("Controllo Aggiornamenti", f"Errore durante il download: {e}")
            self.status_label.config(text=f"Errore controllo aggiornamenti.", foreground="red")

    # ---------- Message Sending Methods ----------
    def get_message(self):
        title = escape_markdown_v2(self.title_entry.get().strip())
        body = escape_markdown_v2(self.body_text.get("1.0", "end-1c").strip())
        sig_value = self.signature_combo.get()
        if sig_value == "Altro":
            sig = escape_markdown_v2(self.other_signature_entry.get().strip())
        else:
            sig = escape_markdown_v2(sig_value)
        
        category_full = self.category_combo.get()
        category_emoji = ""
        if ":" in category_full:
            category_emoji = category_full.split(":")[1].strip()
        
        return f"{category_emoji} *{title}* {category_emoji}\n\n{body}\n\n_{sig}_"

    def preview_message(self):
        messagebox.showinfo("Anteprima Messaggio", self.get_message())

    def log_message(self, message):
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} -> {message}\n\n")
        self.refresh_history()

    def send_message(self):
        self.loop.create_task(self.send_message_async())

    async def send_message_async(self):
        if not self.bot:
            self.status_label.config(text="Errore: Bot non inizializzato.", foreground="red")
            return
        
        chat_name = self.chat_combo.get()
        if not chat_name:
            self.status_label.config(text="Errore: Seleziona una chat.", foreground="red")
            return
            
        chat_id = self.config["CHAT_LIST"].get(chat_name)

        if not chat_id:
            self.status_label.config(text="Errore: Seleziona una chat valida.", foreground="red")
            return
        
        message_text = self.get_message()
        if not self.title_entry.get().strip() or not self.body_text.get("1.0", "end-1c").strip():
            self.status_label.config(text="Errore: Titolo e corpo del messaggio non possono essere vuoti.", foreground="red")
            return
            
        try:
            self.status_label.config(text=f"Invio messaggio a {chat_name}...", foreground="blue")
            await self.bot.send_message(chat_id=chat_id, text=message_text, parse_mode='MarkdownV2')
            self.status_label.config(text="Messaggio inviato!", foreground="green")
            self.log_message(message_text)
            self.title_entry.delete(0, "end")
            self.body_text.delete("1.0", "end")
            self.other_signature_entry.delete(0, "end")
        except TelegramError as e:
            self.status_label.config(text=f"Errore Telegram: {e}", foreground="red")
            messagebox.showerror("Errore Telegram", f"Impossibile inviare il messaggio:\n{e}\n\nControlla la formattazione del testo. Spesso l'errore è causato da caratteri Markdown non correttamente 'escapati'.")
        except Exception as e:
            self.status_label.config(text=f"Errore: {e}", foreground="red")

# ---------- Main Execution Block ----------
if __name__ == "__main__":
    root = tk.Tk()
    app = EBGUI(root)
    root.mainloop()
