# Use Case Diagram

Diagram Use Case menggambarkan interaksi antara aktor (pengguna) dengan sistem SIPAS.

```mermaid
usecaseDiagram
    actor Staf as "Staf / Operator"
    actor Pimpinan as "Pimpinan"
    actor Admin as "Administrator"

    package "SIPAS (Sistem Informasi Persuratan)" {
        usecase "Login Sistem" as UC1
        usecase "Kelola Surat Masuk" as UC2
        usecase "Kelola Surat Keluar" as UC3
        usecase "Beri Disposisi" as UC4
        usecase "Persetujuan (Approval) Surat" as UC5
        usecase "Kelola Pengguna & Master Data" as UC6
        usecase "Lihat Dasbor & Statistik" as UC7
    }

    Staf --> UC1
    Staf --> UC2
    Staf --> UC3
    Staf --> UC7

    Pimpinan --> UC1
    Pimpinan --> UC4
    Pimpinan --> UC5
    Pimpinan --> UC7
    Pimpinan --> UC2 : "Melihat"

    Admin --> UC1
    Admin --> UC6
    Admin --> UC7
```
