import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api"
});

export function login(credentials) {
  return api.post("/login", credentials).then((res) => res.data);
}

export function signup(credentials) {
  return api.post("/signup", credentials).then((res) => res.data);
}

export function getTime() {
  return api.get("/time").then((res) => res.data.dateTime);
}

export function fetchRecords(token) {
  return api.get("/records", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  .then((res) => res.data); 
}

export function fetchRecordsByUsername(username) {
  return api.get(`/records/${username}`).then((res) => res.data);
}

export function fetchRecordsByMonthAndUser(username, month, year, token) {
  return api
    .get(`/records/${username}/month/${month}/${year}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then((res) => res.data);
}

export function fetchLatestRecordByUsername(username, token) {
  return api
    .get(`/records/${username}/latest`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then((res) => res.data);
}

export function fetchRecordsByMonth(month, year, token) {
  console.log("fetchRecordsByMonth", month, year);
  return api
    .get(`/records/month/${month}/${year}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
    .then((res) => res.data);
}

export function stamp(username, type, token) {
  return api
    .post(
      "/records",
      { username, type },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
    .then((res) => res.data);
}
export function updateRecord(id, updates, token) {
  return api.put(`/records/${id}`, updates, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function deleteRecord(id, token) {
  return api.delete(`/records/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
