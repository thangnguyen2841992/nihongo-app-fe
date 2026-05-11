import {initializeApp} from "firebase/app"
import {
  getStorage
} from "firebase/storage"

const firebaseConfig = {
  apiKey: "AIzaSyAO2Rcfya7k19xVUrKkVVn5b8igAXgUy5o",
  authDomain: "nihongo-app-555f3.firebaseapp.com",
  projectId: "nihongo-app-555f3",
  storageBucket: "nihongo-app-555f3.appspot.com",
  messagingSenderId: "444924348433",
  appId: "1:444924348433:web:9acc40edefe114f3d189b0",
  measurementId: "G-TV044DD2H7"
}

const app =
  initializeApp(firebaseConfig)

export const storage =
  getStorage(app)
