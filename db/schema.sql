CREATE TABLE ProjectRequests (
  Id          INT IDENTITY(1,1) PRIMARY KEY,
  Title       NVARCHAR(255)  NOT NULL,
  Description NVARCHAR(MAX),
  Priority    NVARCHAR(20)   NOT NULL DEFAULT 'Medium',
  Status      NVARCHAR(50)   NOT NULL DEFAULT 'Pending',
  RequestedBy NVARCHAR(255)  NOT NULL,
  CreatedAt   DATETIME2      NOT NULL DEFAULT GETDATE()
);
