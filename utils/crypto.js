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

  return {
    iv: CryptoJS.enc.Utf8.parse(ivValue),
    key: CryptoJS.enc.Utf8.parse(secretKey),
  };
};

export async function conversaoCripto(conteudo) {
  const { iv, key } = getCryptoConfig();

  const encrypted = CryptoJS.AES.encrypt(String(conteudo || ""), key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return encrypted.toString();
}
