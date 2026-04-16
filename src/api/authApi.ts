import axios from 'axios'

const gatewayUrl = axios.create({
  baseURL: 'http://localhost:8082', // gateway
  withCredentials: true
})

export default gatewayUrl
