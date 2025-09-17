import tkinter as tk
from tkinter import ttk, messagebox, simpledialog
import asyncio
from telegram import Bot
from telegram.error import TelegramError
from PIL import Image, ImageTk
import json
from datetime import datetime
import os
import shutil
import requests

# ---------- Versione Software ----------
VERSION = "FIPAVVA-1.1.4"

CONFIG_FILE = "config.json"
LOG_FILE = "log.txt"
DRAFT_FILE = "draft.json"
SETTINGS_FILE = "settings.json"

# ---------- Utility JSON ----------
def load_json(filename, default):
    if os.path.exists(filename):
        with open(filename, "r", encoding="utf-8") as f:
            return json.load(f)
    return default

def save_json(filename, data):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# ---------- Telegram Bot GUI ----------
class TelegramBotGUI:
    def __init__(self, root):
        self.root = root
        self.root.title(f"Gestore Canale Telegram")
        self.root.geometry("750x700")
        self.root.resizable(True, True)

        self.config = load_json(CONFIG_FILE, {"BOT_TOKEN": "", "CHAT_LIST": {}})
        self.settings = load_json(SETTINGS_FILE, {"SIGNATURES": [
        ], "UPDATE_SERVER": "downloads.kekkotech.com", "SERVICE_ID": "BOT-FIPAVVA-0001"})
        self.bot = None
        self.init_bot()

        # Stile Frutiger
        style = ttk.Style()
        style.theme_use("clam")
        style.configure(".", font=("Frutiger", 11))
        style.configure("TButton", padding=6)

        self.notebook = ttk.Notebook(root)
        self.notebook.pack(fill="both", expand=True)

        self.create_tab_messages()
        self.create_tab_drafts()
        self.create_tab_history()
        self.create_tab_settings()
        self.create_tab_info() 
        self.load_draft()

    # ---------- Version Utility ----------
    def parse_version(self, v_str):
        """
        Converte una stringa FIPAVVA-x.x.x in una tupla (x, x, x)
        """
        try:
            nums = v_str.replace("FIPAVVA-", "").split(".")
            return tuple(int(n) for n in nums)
        except:
            return (0,0,0)

    # ---------- Bot ----------
    def init_bot(self):
        try:
            self.bot = Bot(token=self.config.get("BOT_TOKEN",""))
        except Exception as e:
            self.bot = None
            print("Errore inizializzazione bot:", e)
        # Aggiorna chat e firme live
        if hasattr(self, "chat_combo"):
            self.chat_combo['values'] = list(self.config.get("CHAT_LIST", {}).keys())
            if self.chat_combo['values']:
                self.chat_combo.current(0)
        if hasattr(self, "signature_combo"):
            self.update_signature_combobox()

    # ---------- Tab Messaggi ----------
    def create_tab_messages(self):
        self.tab_messages = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_messages, text="Messaggi")
        frame = ttk.Frame(self.tab_messages, padding=10)
        frame.pack(fill="both", expand=True)

        ttk.Label(frame,text="Titolo Messaggio:", font=("Frutiger",12,"bold")).grid(row=0,column=0, sticky="w")
        self.title_entry = ttk.Entry(frame,width=60)
        self.title_entry.grid(row=1,column=0,pady=5)

        try:
            img = Image.open("fipav_logo.png")
            img.thumbnail((170,80), Image.LANCZOS)
            self.logo_image = ImageTk.PhotoImage(img)
            ttk.Label(frame,image=self.logo_image).grid(row=0,column=1, sticky="e")
        except: pass

        ttk.Label(frame,text="Seleziona Chat:", font=("Frutiger",12,"bold")).grid(row=2,column=0, sticky="w")
        self.chat_combo = ttk.Combobox(frame, values=list(self.config.get("CHAT_LIST",{}).keys()), state="readonly", width=30)
        self.chat_combo.grid(row=3,column=0,pady=5)
        if self.chat_combo['values']:
            self.chat_combo.current(0)

        ttk.Label(frame,text="Categoria:", font=("Frutiger",12,"bold")).grid(row=4,column=0, sticky="w")
        self.category_options = ["Territoriale: 🔴⚪️","Regionale: 🟢🔵","Nazionale: 🇮🇹","Lutto: ⚫"]
        self.category_combo = ttk.Combobox(frame, values=self.category_options, state="readonly", width=30)
        self.category_combo.grid(row=5,column=0,pady=5)
        self.category_combo.current(0)

        ttk.Label(frame,text="Corpo del Messaggio:", font=("Frutiger",12,"bold")).grid(row=6,column=0, sticky="w")
        self.body_text = tk.Text(frame,height=12,width=60,font=("Frutiger",11))
        self.body_text.grid(row=7,column=0,columnspan=2,pady=5)

        ttk.Label(frame,text="Firma:", font=("Frutiger",12,"bold")).grid(row=8,column=0, sticky="w")
        self.signature_combo = ttk.Combobox(frame, state="readonly", width=30)
        self.signature_combo.grid(row=9,column=0,pady=5)
        self.signature_combo.bind("<<ComboboxSelected>>", self.toggle_other_signature_field)
        self.update_signature_combobox()

        self.other_signature_frame = ttk.Frame(frame)
        self.other_signature_label = ttk.Label(self.other_signature_frame,text="Inserisci firma:")
        self.other_signature_entry = ttk.Entry(self.other_signature_frame,width=30)

        btn_frame = ttk.Frame(frame)
        btn_frame.grid(row=10,column=0,columnspan=2,pady=10)
        ttk.Button(btn_frame,text="Anteprima Messaggio", command=self.preview_message).pack(side="left", padx=5)
        ttk.Button(btn_frame,text="Salva Bozza", command=self.save_draft).pack(side="left", padx=5)
        ttk.Button(btn_frame,text="Invia Messaggio", command=self.send_message).pack(side="left", padx=5)

        self.status_label = ttk.Label(frame,text="", font=("Frutiger",10,"italic"))
        self.status_label.grid(row=11,column=0,columnspan=2)

    def toggle_other_signature_field(self,event):
        if self.signature_combo.get()=="Altro":
            self.other_signature_frame.grid(row=9,column=1, sticky="w", pady=5)
            self.other_signature_label.pack(side="left")
            self.other_signature_entry.pack(side="left")
        else:
            self.other_signature_frame.grid_forget()

    def update_signature_combobox(self):
        values = self.settings.get("SIGNATURES",[]) + ["Altro"]
        self.signature_combo['values'] = values
        if values:
            self.signature_combo.current(0)

    # ---------- Tab Bozze ----------
    def create_tab_drafts(self):
        self.tab_drafts = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_drafts, text="Bozze")
        frame = ttk.Frame(self.tab_drafts, padding=10)
        frame.pack(fill="both", expand=True)

        ttk.Label(frame,text="Bozze Salvate:", font=("Frutiger",12,"bold")).pack(anchor="w")
        self.draft_listbox = tk.Listbox(frame, height=15)
        self.draft_listbox.pack(fill="both", expand=True)

        btn_frame = ttk.Frame(frame)
        btn_frame.pack(pady=5)
        ttk.Button(btn_frame,text="Carica Bozza Selezionata", command=self.load_selected_draft).pack(side="left", padx=5)
        ttk.Button(btn_frame,text="Elimina Bozza Selezionata", command=self.delete_selected_draft).pack(side="left", padx=5)

        self.refresh_draft_list()

    def refresh_draft_list(self):
        self.draft_listbox.delete(0,"end")
        drafts = load_json(DRAFT_FILE, [])
        if isinstance(drafts,list):
            for i,d in enumerate(drafts):
                self.draft_listbox.insert("end", f"{i+1} - {d.get('title','')}")
        elif isinstance(drafts,dict):
            self.draft_listbox.insert("end", drafts.get("title",""))

    def delete_selected_draft(self):
        sel = self.draft_listbox.curselection()
        if not sel: return
        idx = sel[0]
        drafts = load_json(DRAFT_FILE, [])
        if isinstance(drafts,list):
            drafts.pop(idx)
            save_json(DRAFT_FILE, drafts)
        else:
            os.remove(DRAFT_FILE)
        self.refresh_draft_list()
        messagebox.showinfo("Bozza","Bozza eliminata correttamente!")

    def save_draft(self):
        draft = {
            "title": self.title_entry.get(),
            "body": self.body_text.get("1.0","end-1c"),
            "signature": self.other_signature_entry.get() if self.signature_combo.get()=="Altro" else self.signature_combo.get(),
            "category": self.category_combo.get(),
            "chat": self.chat_combo.get()
        }
        drafts = load_json(DRAFT_FILE, [])
        if not isinstance(drafts,list):
            drafts = [drafts] if drafts else []
        drafts.append(draft)
        save_json(DRAFT_FILE, drafts)
        self.refresh_draft_list()
        messagebox.showinfo("Bozza","Bozza salvata correttamente!")

    def load_draft(self):
        drafts = load_json(DRAFT_FILE, [])
        if isinstance(drafts,list) and drafts:
            d = drafts[-1]
            self.title_entry.insert(0,d.get("title",""))
            self.body_text.insert("1.0", d.get("body",""))
            cat = d.get("category","")
            if cat in self.category_options:
                self.category_combo.set(cat)
            chat = d.get("chat","")
            if chat in self.config.get("CHAT_LIST",{}):
                self.chat_combo.set(chat)
            sig = d.get("signature","")
            if sig in self.settings.get("SIGNATURES",[]):
                self.signature_combo.set(sig)
            else:
                self.signature_combo.set("Altro")
                self.toggle_other_signature_field(None)
                self.other_signature_entry.insert(0,sig)

    def load_selected_draft(self):
        sel = self.draft_listbox.curselection()
        if not sel: return
        idx = sel[0]
        drafts = load_json(DRAFT_FILE, [])
        d = drafts[idx]
        self.title_entry.delete(0,"end")
        self.title_entry.insert(0,d.get("title",""))
        self.body_text.delete("1.0","end")
        self.body_text.insert("1.0", d.get("body",""))
        cat = d.get("category","")
        if cat in self.category_options:
            self.category_combo.set(cat)
        chat = d.get("chat","")
        if chat in self.config.get("CHAT_LIST",{}):
            self.chat_combo.set(chat)
        sig = d.get("signature","")
        if sig in self.settings.get("SIGNATURES",[]):
            self.signature_combo.set(sig)
        else:
            self.signature_combo.set("Altro")
            self.toggle_other_signature_field(None)
            self.other_signature_entry.delete(0,"end")
            self.other_signature_entry.insert(0,sig)

    # ---------- Tab Cronologia ----------
    def create_tab_history(self):
        self.tab_history = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_history, text="Cronologia")
        frame = ttk.Frame(self.tab_history, padding=10)
        frame.pack(fill="both", expand=True)

        ttk.Label(frame,text="Messaggi Inviati:", font=("Frutiger",12,"bold")).pack(anchor="w")
        self.log_listbox = tk.Listbox(frame,height=20)
        self.log_listbox.pack(fill="both", expand=True)
        self.refresh_history()

    def refresh_history(self):
        self.log_listbox.delete(0,"end")
        if os.path.exists(LOG_FILE):
            with open(LOG_FILE,"r", encoding="utf-8") as f:
                lines = f.read().split("\n\n")
                for l in lines:
                    if l.strip():
                        self.log_listbox.insert("end", l[:80]+"...")

    # ---------- Tab Impostazioni ----------
    def create_tab_settings(self):
        self.tab_settings = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_settings, text="Impostazioni")
        frame = ttk.Frame(self.tab_settings, padding=10)
        frame.pack(fill="both", expand=True)

        ttk.Label(frame, text="Bot Token:", font=("Frutiger",12,"bold")).grid(row=0,column=0, sticky="w")
        self.token_entry = ttk.Entry(frame,width=60)
        self.token_entry.grid(row=1,column=0,pady=5)
        self.token_entry.insert(0, self.config.get("BOT_TOKEN",""))

        ttk.Label(frame,text="Lista Chat:", font=("Frutiger",12,"bold")).grid(row=2,column=0, sticky="w")
        self.chat_listbox = tk.Listbox(frame,height=8)
        self.chat_listbox.grid(row=3,column=0, sticky="ew")
        for chat_name, chat_id in self.config.get("CHAT_LIST",{}).items():
            self.chat_listbox.insert("end", f"{chat_name} -> {chat_id}")

        chat_btn_frame = ttk.Frame(frame)
        chat_btn_frame.grid(row=4,column=0,pady=5, sticky="w")
        ttk.Button(chat_btn_frame,text="Aggiungi Chat", command=self.add_chat).pack(side="left", padx=5)
        ttk.Button(chat_btn_frame,text="Modifica Chat", command=self.edit_chat).pack(side="left", padx=5)
        ttk.Button(chat_btn_frame,text="Rimuovi Chat", command=self.remove_chat).pack(side="left", padx=5)

        # Gestione firme
        ttk.Label(frame,text="Firme Predefinite:", font=("Frutiger",12,"bold")).grid(row=5,column=0, sticky="w")
        self.sign_listbox = tk.Listbox(frame,height=6)
        self.sign_listbox.grid(row=6,column=0, sticky="ew")
        for s in self.settings.get("SIGNATURES",[]):
            self.sign_listbox.insert("end", s)

        sign_btn_frame = ttk.Frame(frame)
        sign_btn_frame.grid(row=7,column=0,pady=5, sticky="w")
        ttk.Button(sign_btn_frame,text="Aggiungi Firma", command=self.add_signature).pack(side="left", padx=5)
        ttk.Button(sign_btn_frame,text="Rimuovi Firma", command=self.remove_signature).pack(side="left", padx=5)

        # ---------- Update Server e Service ID ----------
        ttk.Label(frame, text="Update Server:", font=("Frutiger",12,"bold")).grid(row=8,column=0, sticky="w")
        self.update_server_entry = ttk.Entry(frame,width=60)
        self.update_server_entry.grid(row=9,column=0,pady=5)
        self.update_server_entry.insert(0, self.settings.get("UPDATE_SERVER",""))

        ttk.Label(frame, text="Service ID:", font=("Frutiger",12,"bold")).grid(row=10,column=0, sticky="w")
        self.service_id_entry = ttk.Entry(frame,width=60)
        self.service_id_entry.grid(row=11,column=0,pady=5)
        self.service_id_entry.insert(0, self.settings.get("SERVICE_ID",""))

        ttk.Button(frame,text="Controllo Aggiornamenti", command=self.check_update).grid(row=12,column=0,pady=10)

        ttk.Button(frame,text="Salva Impostazioni", command=self.save_settings).grid(row=13,column=0,pady=10)

    # ---------- Tab Info ----------
    def create_tab_info(self):
        self.tab_info = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_info, text="Info")
        frame = ttk.Frame(self.tab_info, padding=10)
        frame.pack(fill="both", expand=True)

        ttk.Label(frame, text=f"Copyright (C) 2025 KekkoTech Softwares - Italia", font=("Frutiger",12,"bold")).pack(anchor="w", pady=5)
        ttk.Label(frame, text=f"Per feedback: feedback@kekkotech.it", font=("Frutiger",12)).pack(anchor="w", pady=5)
        ttk.Label(frame, text=f"Per ricevere supporto: support@kekkotech.it", font=("Frutiger",12)).pack(anchor="w", pady=5)
        ttk.Label(frame, text=f"\nInformazioni Software:", font=("Frutiger",16,"bold")).pack(anchor="w", pady=5)        
        ttk.Label(frame, text=f"Versione Corrente: {VERSION}", font=("Frutiger",12)).pack(anchor="w", pady=5)
        update_server = self.settings.get("UPDATE_SERVER","Non impostato")
        service_id = self.settings.get("SERVICE_ID","Non impostato")
        ttk.Label(frame, text=f"Update Server: {update_server}", font=("Frutiger",12)).pack(anchor="w", pady=5)
        ttk.Label(frame, text=f"Service ID: {service_id}", font=("Frutiger",12)).pack(anchor="w", pady=5)
        ttk.Label(frame, text=f"\nInformazioni Default:", font=("Frutiger",16,"bold")).pack(anchor="w", pady=5) 
        ttk.Label(frame, text=f"Default Update Server: downloads.kekkotech.com", font=("Frutiger",12)).pack(anchor="w", pady=5)
        ttk.Label(frame, text=f"Default Settings: https://{update_server}/{service_id}/install/settings.json", font=("Frutiger",12)).pack(anchor="w", pady=5)
        ttk.Label(frame, text=f"Default Settings: https://{update_server}/{service_id}/install/config.json", font=("Frutiger",12)).pack(anchor="w", pady=5)
        ttk.Label(frame, text=f"Default Settings: https://{update_server}/{service_id}/install/draft.json", font=("Frutiger",12)).pack(anchor="w", pady=5)
        ttk.Label(frame, text=f"Default Settings: https://{update_server}/{service_id}/install/log.txt", font=("Frutiger",12)).pack(anchor="w", pady=5)

    # ---------- Funzioni Chat ----------
    def add_chat(self):
        name = simpledialog.askstring("Aggiungi Chat","Nome Chat:")
        if not name: return
        chat_id = simpledialog.askstring("Aggiungi Chat","ID Chat:")
        if not chat_id: return
        self.chat_listbox.insert("end", f"{name} -> {chat_id}")

    def edit_chat(self):
        sel = self.chat_listbox.curselection()
        if not sel: return
        idx = sel[0]
        old = self.chat_listbox.get(idx)
        name, chat_id = old.split(" -> ")
        new_name = simpledialog.askstring("Modifica Chat","Nome Chat:", initialvalue=name)
        if not new_name: return
        new_id = simpledialog.askstring("Modifica Chat","ID Chat:", initialvalue=chat_id)
        if not new_id: return
        self.chat_listbox.delete(idx)
        self.chat_listbox.insert(idx,f"{new_name} -> {new_id}")

    def remove_chat(self):
        sel = self.chat_listbox.curselection()
        if sel: self.chat_listbox.delete(sel[0])

    # ---------- Funzioni Firme ----------
    def add_signature(self):
        sig = simpledialog.askstring("Aggiungi Firma","Nome Firma:")
        if sig:
            self.sign_listbox.insert("end", sig)

    def remove_signature(self):
        sel = self.sign_listbox.curselection()
        if sel: self.sign_listbox.delete(sel[0])

    # ---------- Salva Impostazioni ----------
    def save_settings(self):
        self.config["BOT_TOKEN"] = self.token_entry.get().strip()
        chat_dict = {}
        for i in range(self.chat_listbox.size()):
            name,id_ = self.chat_listbox.get(i).split(" -> ")
            chat_dict[name] = id_
        self.config["CHAT_LIST"] = chat_dict
        save_json(CONFIG_FILE,self.config)

        # Salva firme
        sigs = [self.sign_listbox.get(i) for i in range(self.sign_listbox.size())]
        self.settings["SIGNATURES"] = sigs

        # Salva update server e service ID
        self.settings["UPDATE_SERVER"] = self.update_server_entry.get().strip()
        self.settings["SERVICE_ID"] = self.service_id_entry.get().strip()
        save_json(SETTINGS_FILE,self.settings)

        self.init_bot()
        messagebox.showinfo("Impostazioni","Salvate correttamente!")

    # ---------- Controllo Aggiornamenti ----------
    def check_update(self):
        server = self.update_server_entry.get().strip()
        service = self.service_id_entry.get().strip()
        if not server or not service:
            messagebox.showwarning("Controllo Aggiornamenti", "Inserisci Update Server e Service ID!")
            return

        version_url = f"https://{server}/{service}/updates/version.txt"
        script_url = f"https://{server}/{service}/updates/gestione_telegram.py"

        try:
            r = requests.get(version_url)
            r.raise_for_status()
            server_version = r.text.strip()

            # Confronto versioni con parsing FIPAVVA-x.x.x
            if self.parse_version(server_version) <= self.parse_version(VERSION):
                messagebox.showinfo("Controllo Aggiornamenti", f"Versione corrente ({VERSION}) già aggiornata.")
                return

            r = requests.get(script_url)
            r.raise_for_status()
            if os.path.exists("gestione_telegram.py"):
                backup_name = f"gestione_telegram_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.py"
                shutil.copy("gestione_telegram.py", backup_name)
            with open("gestione_telegram.py","wb") as f:
                f.write(r.content)
            messagebox.showinfo("Controllo Aggiornamenti",
                                f"Aggiornamento scaricato correttamente!\nBackup salvato.\nVersione aggiornata: {server_version}")
        except Exception as e:
            messagebox.showerror("Controllo Aggiornamenti", f"Errore durante il download: {e}")

    # ---------- Funzioni Messaggi ----------
    def get_message(self):
        title = self.title_entry.get().strip()
        body = self.body_text.get("1.0","end-1c").strip()
        sig = self.other_signature_entry.get().strip() if self.signature_combo.get()=="Altro" else self.signature_combo.get()
        category_emoji = self.category_combo.get().split(":")[1].strip()
        return f"{category_emoji}{title}{category_emoji}\n\n{body}\n\n~{sig}"

    def preview_message(self):
        messagebox.showinfo("Anteprima Messaggio", self.get_message())

    def log_message(self,message):
        with open(LOG_FILE,"a", encoding="utf-8") as f:
            f.write(f"{datetime.now()} -> {message}\n\n")
        self.refresh_history()

    def send_message(self):
        if not self.bot:
            self.status_label.config(text="Errore: Bot non inizializzato.", foreground="red")
            return
        message = self.get_message()
        chat_name = self.chat_combo.get()
        chat_id = self.config["CHAT_LIST"].get(chat_name)
        async def send_async():
            try:
                await self.bot.send_message(chat_id=chat_id, text=message)
                self.status_label.config(text="Messaggio inviato!", foreground="green")
                self.log_message(message)
                self.title_entry.delete(0,"end")
                self.body_text.delete("1.0","end")
                self.other_signature_entry.delete(0,"end")
            except TelegramError as e:
                self.status_label.config(text=f"Errore Telegram: {e}", foreground="red")
            except Exception as e:
                self.status_label.config(text=f"Errore: {e}", foreground="red")
        asyncio.run(send_async())

if __name__ == "__main__":
    root = tk.Tk()
    app = TelegramBotGUI(root)
    root.mainloop()
