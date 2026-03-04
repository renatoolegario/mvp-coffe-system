import CryptoJS from "crypto-js";

const getCryptoConfig = () => {
  const secretKey = process.env.SECRET_KEY;
  const ivValue = process.env.IV;

  if (!secretKey) {
    throw new Error("Chave secreta não definida");
  }

  if (!ivValue) {
    throw new Error("IV não definido");
  }

  // Deriva tamanhos válidos para AES-256-CBC sem depender do tamanho do segredo.
  const keyHash = CryptoJS.SHA256(String(secretKey));
  const ivHash = CryptoJS.MD5(String(ivValue));

  return {
    iv: ivHash,
    key: keyHash,
  };
};

export const encryptText = (content) => {
  const { iv, key } = getCryptoConfig();

  const encrypted = CryptoJS.AES.encrypt(String(content ?? ""), key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return encrypted.toString();
};

export const decryptText = (content) => {
  if (content === null || content === undefined || content === "") {
    return "";
  }

  try {
    const { iv, key } = getCryptoConfig();
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Base64.parse(String(content)),
    });
    const bytes = CryptoJS.AES.decrypt(cipherParams, key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    return "";
  }
};

export const isEncryptedText = (value) => {
  if (value === null || value === undefined || value === "") {
    return false;
  }

  const decrypted = decryptText(value);
  if (!decrypted) return false;
  return encryptText(decrypted) === value;
};

export const encryptIfNeeded = (value) => {
  if (value === null || value === undefined) return null;
  const text = String(value);
  if (!text) return "";
  return isEncryptedText(text) ? text : encryptText(text);
};

export const decryptIfNeeded = (value) => {
  if (value === null || value === undefined) return null;
  const text = String(value);
  if (!text) return "";
  return isEncryptedText(text) ? decryptText(text) : text;
};

export async function conversaoCripto(conteudo) {
  return encryptText(conteudo);
}

export async function conversaoDescripto(conteudo) {
  return decryptText(conteudo);
}
