import axios from "axios";
export const loginUser = async (email: string, password: string, remember: boolean) => {
  const res = await axios.post("/user/login", { email, password, remember });
  if (res.status !== 200) {
    throw new Error("Unable to login");
  }
  const data = await res.data;
  return data;
};

export const isExistedLink = async (url: string) => {
  const res = await axios.post("/link/check-url", { url });
  if (res.status !== 200) {
    throw new Error("Link IS NOT valid!");
  }
  const data = await res.data;
  return data;
};

export const signupUser = async ( name: string, email: string, password: string ) => {
  const res = await axios.post("/user/signup", { name, email, password });
  if (res.status !== 201) {
    throw new Error("Unable to Signup");
  }
  const data = await res.data;
  return data;
};

export const changePassword = async ( email: string, password: string ) => {
  const res = await axios.patch("/user/change-password", { email, newPassword: password });
  if (res.status !== 200) {
    throw new Error("Unable to Signup");
  }
  const data = await res.data;
  return data;
}

export const sendOTPUser = async ( email: string ) => {
  const res = await axios.post("/user/request-reset", { email });
  if (res.status !== 200) {
    throw new Error("Unable to Send OTP");
  }
  const data = await res.data;
  return data;
};

export const authOTPUser = async ( email: string, otpCode: string ) => {
  const res = await axios.post("/user/auth-otp", { email, otpCode });
  if (res.status !== 200) {
    throw new Error("Unable to auth OTP");
  }
  const data = await res.data;
  return data;
};

export const checkAuthStatus = async () => {
  const res = await axios.get("/user/auth-status");
  if (res.status !== 200) {
    throw new Error("Unable to authenticate");
  }
  const data = await res.data;
  return data;
};

export const sendChatRequest = async (message: string) => {
  const res = await axios.post("/chat/new", { message });
  if (res.status !== 200) {
    throw new Error("Unable to send chat");
  }
  const data = await res.data;
  return data;
};

export const sendChatRequestGemini = async (message: string) => {
  const res = await axios.post("/chatGemini/new", { message });
  if (res.status !== 200) {
    throw new Error("Unable to send chat");
  }
  const data = await res.data;
  return data;
}

export const sendLinkRequest = async (link: string, index: string) => {
  const res = await axios.post("/link/new", { link, index });
  if (res.status !== 200) {
    throw new Error("Unable to link chat");
  }
  const data = await res.data;
  return data;
};

export const sendFileRequest = async (name: string, content: Object, index: string) => {
  const res = await axios.post("/file/new", {name, content, index});

  if (res.status !== 200) {
    throw new Error("Unable to send file");
  } 
  const data = await res.data;
  return data;
};

export const createNewIndex = async (indexName: string) => {
  const res = await axios.post("indice/new", { indexName });
  if (res.status !== 200) {
    throw new Error("Unable to Create a new Index");
  } 
  const data = await res.data;
  return data;
}


export const getUserChats = async () => {
  const res = await axios.get("/chat/all-chats");
  if (res.status !== 200) {
    throw new Error("Unable to send chat");
  }
  const data = await res.data;
  return data;
};

export const getAllIndices = async () => {
  const res = await axios.get("/indice/all-indices");
  if (res.status !== 200) {
    throw new Error("Unable to get index");
  }
  const data = await res.data;
  return data;
}

export const getIndexDetails = async (index: string) => {
  const res = await axios.get(`/indice/details/${index}`);
  if (res.status !== 200) {
    throw new Error("Unable to get index");
  }
  const data = await res.data;
  return data;
};

export const getIndexSources = async (index: string) => {
  const res = await axios.get(`/indice/sources/${index}`);
  if (res.status !== 200) {
    throw new Error("Unable to get index");
  }
  const data = await res.data;
  return data;
}

export const deleteUserChats = async () => {
  const res = await axios.delete("/chat/delete");
  if (res.status !== 200) {
    throw new Error("Unable to delete chats");
  }
  const data = await res.data;
  return data;
};

export const logoutUser = async () => { 
  const res = await axios.get("/user/logout");
  if (res.status !== 200) {
    throw new Error("Unable to delete chats");
  }
  const data = await res.data;
  return data;
};