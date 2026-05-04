<script setup lang="ts">
</script>

<template>
  <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm px-3">

    <div class="container-fluid">

      <span class="navbar-brand fw-bold">
        📚 Staff Dashboard
      </span>

      <div class="d-flex align-items-center">

        <i class="bi bi-bell me-3"></i>

        <div class="dropdown">
          <button class="btn btn-light dropdown-toggle" data-bs-toggle="dropdown">
            <i class="bi bi-person-circle me-1"></i>
            Staff
          </button>

          <ul class="dropdown-menu dropdown-menu-end">
            <li><a class="dropdown-item">Profile</a></li>
            <li><a class="dropdown-item text-danger">Logout</a></li>
          </ul>
        </div>

      </div>

    </div>

  </nav>
</template>
