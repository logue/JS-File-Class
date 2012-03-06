// Html Aplication IO Script
// Copyright (c)2009 Logue <http://logue.be/> All rights reserved.

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

// Usage :
//   var io = new Io();
//   filecontent = io.read(filename);

// Notice:
//   This script is use for local aplication(HTA, air ,widgit etc).
//   DO NOT USE INTERNET APLICATION, for security reson.

// Constractor
function Io(){
	this.initialize.apply(this,arguments);
}

// prototype
Io.prototype = {
	meta: {
		"@prefix": "<http://purl.org/net/ns/doas#>",
		"@about": "<io.js>", a: ":JavaScript",
		 title: "Html Aplication IO Script",
		 created: "2009-01-17", release: {revision: "1.0.1", created: "2009-04-21"},
		 author: {name: "Logue", homepage: "<http://logue.be/>"},
		 license: "<http://www.gnu.org/licenses/gpl-3.0.html>"
	},
	initialize: function() {
		// ブラウザ判別
		this.isIE = window.ActiveXObject;
		this.isFF = window.Components;

		// オブジェクト生成
		if (this.isIE){
			this.wsh = new ActiveXObject( "WScript.Shell" );
			this.wsc = new ActiveXObject( "WSHController" );
			this.fso = new ActiveXObject( "Scripting.FileSystemObject" );
			this.sct = new ActiveXObject( "ScriptControl" );
			this.sha = new ActiveXObject( "Shell.Application" );
			this.xml = new ActiveXObject( "Microsoft.XMLDOM" );

			if (!this.user) this.user = "USER";	// 操作する環境変数の特権クラス
		}else if (this.isFF){
			netscape.security.PrivilegeManager.enablePrivilege('UniversalXPConnect');
		}else if (window.runtime.flash.filesystem){
			// Adobe Air用（未テスト）
			this.air = window.runtime.flash.filesystem;
		}else if (widget.system){
			// MacOS X dashbord用（未テスト）
			this.sh = widget.system;
			if (window.WFile) console.error('WFile is not installed. please referer to http://www.adamrocker.com/blog/160/wfile_reference.html');
		}else{
			console.error('This script works only ActiveX or AIR or Dashboard supported browser.');
		}
	},
	// レジストリ読み込み（Windowsのみ）
	readReg : function(key) {
		if (this.wsh){
			try{ 
				return this.wsh.RegRead(key);
			}catch(e){
				return false;
			}
		}else{
			return false;
		}
	},
	//レジストリ書き込み（Windowsのみ）
	writeReg : function (key, value, type){
		if (this.wsh){
			try{ 
				return this.wsh.RegWrite(key,value,type);
			}catch(e){
				return e;
			}
		}else{
			return false;
		}
	},
	//レジストリ削除（Windowsのみ）
	deleReg : function (key){
		if (this.wsh){
			try{ 
				return this.wsh.RegDelete(key);
			}catch(e){
				return e;
			}
		}else{
			return false;
		}
	},
	//レジストリサブキー一覧（Windowsのみ）
	listReg : function (key){
		if (this.sct){
			var regs = key.split('\\');
			var nRegRoot;
			var sRegPath = regs.shift().join('\\');
			switch (regs[0]){
				case 'HKCR': case 'HKEY_CLASSES_ROOT' :
					nRegRoot = '0x80000000';
				break;
				case 'HKCU': case 'HKEY_CURRENT_USER' :
					nRegRoot = '0x80000001';
				break;
				case 'HKLM': case 'HKEY_LOCAL_MACHINE' :
					nRegRoot = '0x80000002';
				break;
				case 'HKU' : case 'HKEY_USERS' :
					nRegRoot = '0x80000003';
				break;
				case 'HKEY_CURRENT_CONFIG' :
					nRegRoot = '0x80000004';
				break;
			}
			// VBSなんて知らないよ
			var sRegProv = "winmgmts:{impersonationLevel=impersonate}!\\\\.\\root\\default:StdRegProv";
			var sScriptText = [
				'Function RegEnum(sRegProv, nRegRoot, sRegPath)',
				'	Call GetObject(sRegProv).EnumKey(nRegRoot, sRegPath, RegEnum2)',
				'End Function'
			].join("\n");

			this.sct.Language = "VBScript";
			this.sct.AddCode(sScriptText);
			try{
				var sResult = this.sct.Run("RegEnum", sRegProv, nRegRoot, sRegPath);
				if(sResult == null) return null;
				return new VBArray(sResult).toArray();
			}catch(e){
				return e;
			}
		}else{
			return false;
		}
	},
	// 環境変数取得（Windows／Macのみ）
	readEnv : function (env){
		if (this.wsh){
			return this.wsh.Environment(this.user).Item(env);
		}else if (this.sh){
			return this.sh('printenv '+ env,null).outputString;
		}else{
			return false;
		}
	},
	// 環境変数設定（Windows／Macのみ）
	setEnv : function (env,value){
		if (this.wsh){
			this.wsh.Environment(this.user).Item(env) = value;
			return true;
		}else if (this.sh){
			return this.sh('export '+ env + ' ' + value ,null).outputString;
		}else{
			return false;
		}
	},
	// 環境変数削除（Windows／Macのみ）
	deleEnv : function (env){
		if (this.wsh){
			this.wsh.Environment(this.user).Remove(env);
			return true;
		}else if (this.sh){
			return this.sh('unset '+ env,null).outputString;
		}else{
			return false;
		}
	},
	// ファイル存在確認
	exsists : function(name){
		if (this.fso){
			if (this.fso.FileExists(name)){
				return true;
//			}else if (name.match(/\\$/) && this.fso.FolderExists(name)){
//				return 'folder';
			}else{
				return false;
			}
		}else if(this.sh){
			if (this.sh(name + ' -f',null).outputString){
				return true;
			}else if (this.sh(name + ' -d',null).outputString){
				return 'folder';
			}else{
				return false;
			}
		}else if(this.air){
			return this.air.File.name.exists;
		}
	},
	// コマンド実行（Windows／Macのみ）
	// コールバック関数が入っている場合は、非同期通信になる
	exec : function(cmd, async) {
		if (this.exsists(file) == true){
			var oExec = this.wsh.Exec(cmd);	// 非同期実行を開始してWshExecオブジェクトを得る
			if (this.wsh){
				(function commandWaitLoop() {
					switch(oExec.Status) {
						// WshRunning - 未だ実行中
						case 0: 
							// 100ミリ秒後にもう一度statusを見ることにする
							setTimeout(commandWaitLoop, 100);
							if (async) async();
						break;

						// WshFinished - コマンドの実行が完了した
						case 1:
							// 標準出力の内容を全て読み取ってコールバック関数に渡す
							return process.StdOut.ReadAll();
						break;

						// WshFailed - コマンドの実行に失敗した
						case 2: 
							// 例外を投げる
							throw new Error("asyncExecuteCommand failed");
					}
				})();
			}else if(this.sh){
				return widget.system(cmd, null).outputString;
			}else{
				return null;
			}
		}else{
			return false;
		}
	},
	// 実行（Windows／Macのみ）
	run : function(file){
		if (this.wsh){
			try{
				this.wsh.Run("\""+file+"\"",0,false);
			}catch(e){
				// UACなどでキャンセルした場合エラーになるため、エラー消し
//				console.error(e);
			}
		}else if(this.sh){
			try{
				widget.openApplication(file);	// com.aplication.itunesみたいな形式で入力。たぶん使わないだろうなぁ。
			}catch(e){
				this.sh(file,null);
			}
		}
	},
	echo : function(str){
		if (WScript){
			WScript.Echo(str);
		}else{
			alert(str);
		}
	},
	// バージョン（Windowsのみ）
	version : function(file) {
		if (this.fso && this.exsists(file) != false){
			try{
				return this.fso.GetFileVersion(file);
			}catch(e){
				return e;
			}
		}else{
			return false;
		}
	},
	// ファイル読み込み（Macの場合、WFileプラグインが必要）
	read : function(file, type){
		if (this.exsists(file) == true){
			if (this.fso){
				try {
					var content = this.fso.OpenTextFile(file, 1).ReadAll();
					return content;
					content.close();
				}catch (e){
					return e;
				}
			} else if(navigator.vendorSub){
				try {
					var file = Components.classes["@mozilla.org/file/local;1"].createInstance (Components.interfaces.nsILocalFile);
					file.initWithPath (filePath);
					var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
					fstream.init(file, -1, 0, 0);
					var charset = "UTF-8";
//					const replacementChar = Components.interfaces.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER;
					var is = Components.classes["@mozilla.org/intl/converter-input-stream;1"].createInstance(Components.interfaces.nsIConverterInputStream);
					is.init(fstream, charset, 1024, replacementChar);
					var str = {};
					while (is.readString(4096, str) != 0) {
						data += str.value;
					}
				} catch (e) {
					return e;
				}
				return data;
			}else if(window.WFile){
				return WFile.read(file);
			}else if(this.air){
				var data = new this.air.FileStream();
				data.open(file, this.air.FileMode.READ);
				return data.readMultiByte(file.size, this.air.File.systemCharset);
				data.close();
			}
		}else{
			return false;
		}
	},
	// ファイル保存
	save : function(file, stream){
		if (this.fso){
			try {
				var data = this.fso.OpenTextFile(file, 2, true);
				data.Write(stream);
				data.Close();
				return true;
			}catch (e){
				return e;
			}
		}else if(navigator.vendorSub){
			try {
				var file = Components.classes["@mozilla.org/file/local;1"].createInstance (Components.interfaces.nsILocalFile);
				file.initWithPath (file);
				if (! file.exists ()) file.create (0, 0664);
				var out = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance (Components.interfaces.nsIFileOutputStream);
				out.init (file, 0x20 | 0x02, 00004, null);
				var charset = "UTF-8";
				var conv = Components.classes["\@mozilla.org/intl/converter-output-stream;1"].createInstance(Components.interfaces.nsIConverterOutputStream);
				conv.init(out, charset, 0, 0x0000);
				conv.writeString(stream);
				conv.close();
				return true;
			}catch (e){
				return e;
			}
		}else if (window.WFile){
			WFile.write(file, stream);
			return true;
		}else if (this.air){
			var data = new this.air.FileStream();
			data.open(file, this.air.FileMode.WRITE);
			data.writeUTFBytes(stream);
			data.close();
			return true;
		}
		return false;
	},
	// ファイル書き込み
	wrire : function(file, stream ,line){
		
	},
	// 新規ファイル／ディレクトリ(fileが、\か/で終わる場合はディレクトリとする)
	create: function(file,data){
		if (file.match(/\\$/) || file.match(/\/$/)){
			if (this.fso){
				this.fso.CreateFolder(file);
			}else if(window.WFile){
				WFile.mkdir(file);
			}else if (this.air){
				this.air.File.createDirectory()
			}
		}else{
			if(this.fso){
				var data = this.fso.CreateTextFile(file, true);
				data.writeLine(data);
				data.Close();
			}else if(window.WFile){
				
			}else if (this.air){
				
			}
		}
	},
	// ファイル／ディレクトリを削除
	dele : function(file){
		if (this.exsists(file) != false){
			if (this.fso){
				if (file.match(/\\$/)){
					this.fso.DeleteFolder(file);
				}else{
					this.fso.DeleteFile(file);
				}
				return true;
			}else if(this.sh){
				if (file.match(/\/$/)){
					this.sh('rm -r '+file,null);
				}else{
					this.sh('rm '+file,null);
				}
				return true;
			}else if(this.air){
				this.air.File.moveToTrash(file);
				return true;
			}
		}
		return false;
	},
	// ファイル／ディレクトリを移動
	move  : function(from,to){
		if (this.fso){
			if (from.match(/\\$/)){
				this.fso.MoveFolder(from,to);
			}else{
				this.fso.MoveFile(from,to);
			}
		}else if(this.sh){
			this.sh('mv '+from+' '+to,null);
		}else if(this.air){
			var sourceFile = this.air.File.documentsDirectory;
			sourceFile = sourceFile.resolvePath(from);
			var destination = this.air.File.documentsDirectory;
			destination = destination.resolvePath(to);
			sourceFile.moveTo(destination, true);
		}
	},
	// ファイル／ディレクトリのコピー
	copy  : function(from,to){
		if (this.fso){
			if (from.match(/\\$/)){
				this.fso.CopyFolder(from,to);
			}else{
				this.fso.CopyFile(from,to);
			}
		}else if(this.sh){
			this.sh('cp '+from+' '+to,null);
		}else if(this.air){
			var sourceFile = air.File.documentsDirectory;
			sourceFile = sourceFile.resolvePath(from);
			var destination = air.File.documentsDirectory;
			destination = destination.resolvePath(to);
			sourceFile.copyTo(destination, true);
		}
	},
	// ディレクトリ一覧（Windowsの場合のみ\で終わった場合）
	list : function(name){
		if (this.exsists(name) == true){
			if(this.fso){
				if (name.match(/\\$/)){
					return this.fso.GetFolder(name);
				}else{
					return this.fso.GetFile(name);
				}
			}else if(this.sh){
				return this.sh('ls '+name,null).outputString;
			}else if(this.air){
				return this.air.File.name.getDirectoryListing();
			}
		}else{
			return false;
		}
	},
	bin2hex : function(str){
		// http://phpjs.org/functions/bin2hex:48e4b527-20c0-487d-b0ef-2d6486a786ee
		var v,i, f = 0, a = [];
		s += '';
		f = s.length;

		for (i = 0; i<f; i++) {
			a[i] = s.charCodeAt(i).toString(16).replace(/^([\da-f])$/,"0$1");
		}
		return a.join('');
	},
	// Zip圧縮（Windowsのみ）
	zip : function (file, source){
		var sBaseFolder = this.fso.GetParentFolderName(WScript.ScriptFullName);
		this.wsh.CurrentDirectory = sBaseFolder;

		sDestFile = this.fso.BuildPath(sBaseFolder, sDestFile);
		sSourcePath = this.fso.BuildPath(sBaseFolder, sSourcePath);

		if(!this.fso.FolderExists(source)) return false;

		var sZipHead = "PK\05\06";
		sZipHead += "\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00";

		var oZipFile = this.fso.CreateTextFile(file, true);
		oZipFile.Write(sZipHead);
		oZipFile.Close();

		var oZipFolder = this.sha.NameSpace(sDestFile);
		oZipFolder.CopyHere(sSourcePath);
		return true;
	}
};