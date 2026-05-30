-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Apr 23, 2026 at 10:31 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `umptmy_umpsah_travel`
--

-- --------------------------------------------------------

--
-- Table structure for table `departments`
--

CREATE TABLE `departments` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(150) NOT NULL,
  `hod_id` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `departments`
--

INSERT INTO `departments` (`id`, `name`, `hod_id`, `created_at`) VALUES
(1, 'Information Technology', 2, '2026-03-27 16:26:29'),
(9, 'Business Development', NULL, '2026-03-27 17:03:19'),
(10, 'Property & Facilities Management (PFM)', NULL, '2026-03-27 17:03:19'),
(11, 'Project Management & Consultancy (PMC)', NULL, '2026-03-27 17:03:19'),
(12, 'Innovation & Commercialization', NULL, '2026-03-27 17:03:19'),
(13, 'Financial Services (FS)', NULL, '2026-03-27 17:03:19'),
(14, 'Risk & Audit', NULL, '2026-03-27 17:03:19'),
(15, 'Marketing & Communication', NULL, '2026-03-27 17:03:19'),
(16, 'Legal & Governance', NULL, '2026-03-27 17:03:19'),
(17, 'Compliance & Integrity', NULL, '2026-03-27 17:03:19'),
(18, 'Corporate & Strategic Office (CSO)', NULL, '2026-03-27 17:03:19'),
(19, 'Human Resources & Administration (HRA)', NULL, '2026-03-27 17:03:19'),
(20, 'Group Finance (GF)', NULL, '2026-03-27 17:03:19'),
(21, 'Property Development & Construction (PDC)', NULL, '2026-03-27 17:03:19'),
(22, 'Safety, Health & Environment (SHE)', NULL, '2026-03-27 17:03:19'),
(23, 'Group Procurement (GP)', NULL, '2026-03-27 17:03:19'),
(24, 'Group IT Solutions & Development (GITSD)', 7, '2026-03-27 17:03:19'),
(25, 'Building Information Modelling (BIM)', NULL, '2026-03-27 17:03:19');

-- --------------------------------------------------------

--
-- Table structure for table `email_approval_tokens`
--

CREATE TABLE `email_approval_tokens` (
  `id` int(11) NOT NULL,
  `application_id` int(11) NOT NULL,
  `token` varchar(64) NOT NULL,
  `action` enum('approved','rejected') NOT NULL,
  `used` tinyint(1) NOT NULL DEFAULT 0,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `email_approval_tokens`
--

INSERT INTO `email_approval_tokens` (`id`, `application_id`, `token`, `action`, `used`, `expires_at`, `created_at`) VALUES
(1, 7, 'cdbb3201f751af8dd34867f7de3ed9955ef3e584f0bfae4ce4a12e29111b93dc', 'approved', 1, '2026-04-04 08:58:47', '2026-03-28 15:58:47'),
(2, 7, '7e5bdc0ef981bc14967d8c95aabb7539a4f66c988b44b159f308aef6705c4e8f', 'rejected', 1, '2026-04-04 08:58:47', '2026-03-28 15:58:47'),
(3, 8, '287f96e3bba24fa1e89be27f6eccefa4f92efe1f0021663e4ade9d0d48717e3c', 'approved', 0, '2026-04-04 09:06:38', '2026-03-28 16:06:38'),
(4, 8, '6b5e19a3012951c475ec560235aa44c4e96b967d29bd4c160629884fa5c07279', 'rejected', 0, '2026-04-04 09:06:38', '2026-03-28 16:06:38'),
(5, 9, '21ee47457f7f9bec70d478e1378e0bedd06437bc2a2109dce1236addd78090f4', 'approved', 1, '2026-04-23 08:41:34', '2026-04-16 16:41:34'),
(6, 9, '9f794a8f34cddea07da9e1471e3dcce9873f36a07c3b4d3fb27f78533de8f586', 'rejected', 1, '2026-04-23 08:41:34', '2026-04-16 16:41:34'),
(7, 10, '45c32589aae6dff776f0b6fbb70f8bb2496938bd01e4fb20416fe2047665dbe6', 'approved', 1, '2026-04-23 08:54:23', '2026-04-16 16:54:23'),
(8, 10, '84292e7bae2ab3151dce9a2e564a6e88af7256d409f4dc1cb6da1203c8f9e65b', 'rejected', 1, '2026-04-23 08:54:23', '2026-04-16 16:54:23'),
(9, 12, 'd35920c098a5272ab1fc534b3b379968caae544d894d68d2a742d3f683a4d116', 'approved', 1, '2026-04-24 02:15:53', '2026-04-17 08:15:53'),
(10, 12, '6e421be46c912894cdc698b62e6936a043e0601434cce77dfce7b582f3c2ffa2', 'rejected', 1, '2026-04-24 02:15:53', '2026-04-17 08:15:53'),
(11, 13, 'a6b57dabbd947f47ce4890e07b773a9afb907c3a8da017a1a13d862cb491f410', 'approved', 1, '2026-04-24 02:46:53', '2026-04-17 08:46:53'),
(12, 13, '7acca3aeb58bf4fb3f18d5da2a20382f46b6689f10e30d36d3fd1995e5b60742', 'rejected', 1, '2026-04-24 02:46:53', '2026-04-17 08:46:53'),
(13, 14, 'eaed36b8b57ed061c82f30c1c8395ada723f8cb475d37ced964ba9e6f3e4a773', 'approved', 1, '2026-04-24 09:26:12', '2026-04-17 15:26:12'),
(14, 14, '36d813c5c6a681c2f8ce8d664383f0e786e5b3c6dbb54a825924e4d12020633b', 'rejected', 1, '2026-04-24 09:26:12', '2026-04-17 15:26:12');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` enum('info','success','warning','danger') NOT NULL DEFAULT 'info',
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `type`, `is_read`, `created_at`) VALUES
(1, 2, 'New Travel Application', 'Nurul Ain has submitted a new travel application: \"mega event\". Please review.', 'info', 1, '2026-03-27 16:29:57'),
(2, 3, 'Travel Application Approved ✅', 'Your travel application \"mega event\" has been approved by Ahmad Farhan. Comment: ok approve', 'success', 1, '2026-03-27 16:31:03'),
(3, 2, 'New Travel Application', 'Nurul Ain has submitted a new travel application: \"International AI Conference 2026\". Please review.', 'info', 0, '2026-03-27 17:06:38'),
(4, 3, 'Travel Application Approved ✅', 'Your travel application \"International AI Conference 2026\" has been approved by Ahmad Farhan. Comment: Approved. Attending this conference aligns with UMPSA Technology\'s innovation goals. Ensure flight is booked early.', 'success', 1, '2026-03-27 17:07:36'),
(5, 7, 'Travel Application Approved ✅', 'Your travel application \"Test Conference 2026\" has been approved by Gamma HOD.', 'success', 1, '2026-03-28 03:28:31'),
(6, 8, 'New Travel Application', 'Muhammad Afif Mohd Ali has submitted a new travel application: \"One-Click Approval Test\". Please review.', 'info', 0, '2026-03-28 07:58:47'),
(7, 7, 'Application Approved', 'Your travel application \"One-Click Approval Test\" has been approved.', 'success', 1, '2026-03-28 08:00:07'),
(8, 8, 'New Travel Application', 'Muhammad Afif Mohd Ali has submitted a new travel application: \"Email Format Test\". Please review.', 'info', 0, '2026-03-28 08:06:38'),
(9, 10, 'New Travel Application', 'Amirul Anuar bin Mohd Yatim has submitted a new travel application: \"International Conference on AI\". Please review.', 'info', 1, '2026-04-16 08:41:34'),
(10, 10, 'Application Approved', 'Your travel application \"International Conference on AI\" has been approved.', 'success', 1, '2026-04-16 08:48:19'),
(11, 10, 'New Travel Application', 'Amirul Anuar bin Mohd Yatim has submitted a new travel application: \"System Training\". Please review.', 'info', 1, '2026-04-16 08:54:23'),
(12, 10, 'Application Rejected', 'Your travel application \"System Training\" has been rejected. Reason: Postponed', 'danger', 1, '2026-04-16 09:05:22'),
(13, 7, 'New Travel Application', 'Nurul Ain has submitted a new travel application: \"jalan2\". Please review.', 'info', 0, '2026-04-17 00:15:53'),
(14, 3, 'Application Approved', 'Your travel application \"jalan2\" has been approved.', 'success', 1, '2026-04-17 00:16:32'),
(15, 7, 'New Travel Application', 'Nurul Ain has submitted a new travel application: \"AI conference\". Please review.', 'info', 0, '2026-04-17 00:46:53'),
(16, 3, 'Application Approved', 'Your travel application \"AI conference\" has been approved.', 'success', 1, '2026-04-17 00:48:38'),
(17, 7, 'New Travel Application', 'Nurul Ain has submitted a new travel application: \"International Conference on AI\". Please review.', 'info', 0, '2026-04-17 07:26:12'),
(18, 3, 'Application Approved', 'Your travel application \"International Conference on AI\" has been approved.', 'success', 0, '2026-04-17 07:29:20');

-- --------------------------------------------------------

--
-- Table structure for table `travel_applications`
--

CREATE TABLE `travel_applications` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `travel_title` varchar(255) NOT NULL,
  `travel_from` varchar(255) DEFAULT NULL,
  `destination` varchar(255) NOT NULL,
  `travel_type` enum('domestic','international') NOT NULL DEFAULT 'domestic',
  `purpose` text NOT NULL,
  `departure_date` date NOT NULL,
  `return_date` date NOT NULL,
  `transport_mode` varchar(100) DEFAULT NULL,
  `accommodation` tinyint(1) DEFAULT 0,
  `hotel_name` varchar(255) DEFAULT NULL,
  `employee_grade` varchar(100) DEFAULT NULL,
  `checkin_date` date DEFAULT NULL,
  `checkout_date` date DEFAULT NULL,
  `pax` tinyint(3) UNSIGNED DEFAULT 0,
  `accommodation_remarks` text DEFAULT NULL,
  `estimated_cost` decimal(12,2) DEFAULT 0.00,
  `remarks` text DEFAULT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `hod_comments` text DEFAULT NULL,
  `reviewed_by` int(10) UNSIGNED DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `remarks_hod` text DEFAULT NULL,
  `group_travel` tinyint(1) NOT NULL DEFAULT 0,
  `group_members` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `travel_applications`
--

INSERT INTO `travel_applications` (`id`, `user_id`, `travel_title`, `travel_from`, `destination`, `travel_type`, `purpose`, `departure_date`, `return_date`, `transport_mode`, `accommodation`, `hotel_name`, `employee_grade`, `checkin_date`, `checkout_date`, `pax`, `accommodation_remarks`, `estimated_cost`, `remarks`, `status`, `hod_comments`, `reviewed_by`, `reviewed_at`, `created_at`, `updated_at`, `remarks_hod`, `group_travel`, `group_members`) VALUES
(1, 3, 'mega event', NULL, 'Kuala Lumpur', 'domestic', 'jalan2', '2026-03-28', '2026-03-28', 'Company Vehicle', 0, '', NULL, NULL, NULL, 0, NULL, 0.00, 'ok try test', 'approved', 'ok approve', 2, '2026-03-27 17:31:03', '2026-03-27 16:29:57', '2026-03-27 16:31:03', NULL, 0, NULL),
(2, 3, 'International AI Conference 2026', NULL, 'Singapore', 'international', 'Attending the International Artificial Intelligence Conference 2026 to present research paper and network with industry experts.', '2026-04-10', '2026-04-14', 'Flight', 0, '', NULL, NULL, NULL, 0, NULL, 3500.00, 'Require early approval due to flight booking deadline.', 'approved', 'Approved. Attending this conference aligns with UMPSA Technology\'s innovation goals. Ensure flight is booked early.', 2, '2026-03-27 18:07:36', '2026-03-27 17:06:38', '2026-03-27 17:07:36', NULL, 0, NULL),
(3, 7, 'Test Conference 2026', 'Kuantan', 'Kuala Lumpur', 'domestic', 'Testing the travel application submission to verify bug fix.', '2026-04-01', '2026-04-03', 'Flight', 0, '', '', NULL, NULL, 0, '', 500.00, '', 'approved', '', 8, '2026-03-28 04:28:31', '2026-03-28 03:27:08', '2026-03-28 03:28:31', NULL, 0, NULL),
(4, 8, 'Email Test Application', 'Kuantan', 'Kuala Lumpur', 'domestic', 'Testing email integration after submission.', '2026-04-10', '2026-04-12', 'Flight', 0, '', '', NULL, NULL, 0, '', 800.00, '', 'pending', NULL, NULL, NULL, '2026-03-28 04:07:10', '2026-03-28 04:07:10', NULL, 0, NULL),
(5, 7, 'Test Conference 2026 22', 'Kuantan', 'Kuala Lumpur', 'domestic', 'sadasdasd', '2026-03-28', '2026-03-29', 'Personal Vehicle', 1, 'marriot', 'E1 - E5', '2026-03-27', '2026-03-28', 2, '', 200.00, 'qweqwe', 'pending', NULL, NULL, NULL, '2026-03-28 07:36:36', '2026-03-28 07:36:36', NULL, 0, NULL),
(6, 7, 'National IT Seminar 2026', 'Kuantan', 'Kuala Lumpur', 'domestic', 'Attend national seminar on emerging IT technologies and digital transformation best practices.', '2026-04-15', '2026-04-17', 'Flight', 0, '', '', NULL, NULL, 0, '', 650.00, '', 'pending', NULL, NULL, NULL, '2026-03-28 07:44:48', '2026-03-28 07:44:48', NULL, 0, NULL),
(7, 7, 'One-Click Approval Test', 'Kuantan', 'Johor Bahru', 'domestic', 'Testing one-click email approval workflow.', '2026-05-01', '2026-05-03', 'Flight', 0, '', '', NULL, NULL, 0, '', 450.00, '', 'approved', NULL, NULL, NULL, '2026-03-28 07:58:47', '2026-03-28 08:00:07', NULL, 0, NULL),
(8, 7, 'Email Format Test', 'Kuantan', 'Putrajaya', 'domestic', 'Testing separate email format for applicant vs HOD.', '2026-05-10', '2026-05-11', 'Train (KTM/MRT/LRT)', 0, '', '', NULL, NULL, 0, '', 300.00, '', 'pending', NULL, NULL, NULL, '2026-03-28 08:06:38', '2026-03-28 08:06:38', NULL, 0, NULL),
(9, 10, 'International Conference on AI', 'Kompleks UMPSA Holdings', 'Kuala Lumpur', 'domestic', 'To attend International Conference on AI', '2026-04-17', '2026-04-19', 'Company Vehicle', 1, '4 Seasons Hotel', 'E1 - E5', '2026-04-17', '2026-04-19', 1, 'Non-smoking room', 150.00, 'Additional remarks', 'approved', NULL, 10, '2026-04-16 08:48:19', '2026-04-16 08:41:34', '2026-04-16 08:48:19', NULL, 0, NULL),
(10, 10, 'System Training', 'Kompleks UMPSA Holdings', 'Kuala Lumpur', 'domestic', 'Attending system training @ KL', '2026-04-17', '2026-04-17', 'Company Vehicle', 0, '', '', NULL, NULL, 0, '', 0.00, '', 'rejected', 'Postponed', 10, '2026-04-16 09:05:22', '2026-04-16 08:54:23', '2026-04-16 09:05:22', NULL, 0, NULL),
(11, 3, 'jalan2', 'KL', 'Singapore', 'domestic', 'pergi cari makanaan', '2026-04-17', '2026-04-18', 'Company Vehicle', 1, 'marriot', 'EK1 - EK5', '2026-04-17', '2026-04-17', 2, '', 0.00, '', 'pending', NULL, NULL, NULL, '2026-04-17 00:13:17', '2026-04-17 00:13:17', NULL, 0, NULL),
(12, 3, 'jalan2', 'KL', 'Singapore', 'domestic', 'asdasd', '2026-04-17', '2026-04-18', 'Company Vehicle', 1, 'marriot', 'EK1 - EK5', '2026-04-17', '2026-04-18', 2, 'asdasd', 0.00, '', 'approved', NULL, 7, '2026-04-17 02:16:32', '2026-04-17 00:15:53', '2026-04-17 00:16:32', NULL, 0, NULL),
(13, 3, 'AI conference', 'KL', 'Singapore', 'domestic', 'asdadad', '2026-04-17', '2026-04-18', 'Company Vehicle', 1, 'marriot', 'E1 - E5', '2026-04-17', '2026-04-18', 2, 'asdasd', 0.00, '', 'approved', NULL, 7, '2026-04-17 02:48:38', '2026-04-17 00:46:53', '2026-04-17 00:48:38', NULL, 0, NULL),
(14, 3, 'International Conference on AI', 'Kompleks UMPSA Holdings', 'Kuantan', 'domestic', 'TEST', '2026-04-18', '2026-04-19', 'Company Vehicle', 1, '4 Seasons Hotel', 'E1 - E5', '2026-04-18', '2026-04-19', 2, 'QWE', 0.00, '', 'approved', NULL, 7, '2026-04-17 09:29:20', '2026-04-17 07:26:12', '2026-04-17 07:29:20', NULL, 0, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `name` varchar(150) DEFAULT NULL,
  `tel` varchar(25) DEFAULT NULL,
  `position` varchar(150) DEFAULT NULL,
  `department_id` int(10) UNSIGNED DEFAULT NULL,
  `company` varchar(100) DEFAULT NULL,
  `role` enum('user','hod','admin') NOT NULL DEFAULT 'user',
  `profile_completed` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `google_id` varchar(100) DEFAULT NULL,
  `hod_email` varchar(255) DEFAULT NULL,
  `employee_grade` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password`, `name`, `tel`, `position`, `department_id`, `company`, `role`, `profile_completed`, `created_at`, `google_id`, `hod_email`, `employee_grade`) VALUES
(1, 'admin@umpsah.edu.my', '$2y$10$gKlQ8ZRJNaVSWrBzF5LK/.wGMnwQN0d6BlQafyq.LFumkPwSs29WK', 'System Administrator', '0199999999', 'Administrator', NULL, 'UMPSAH Holdings Group', 'admin', 1, '2026-03-27 16:26:29', NULL, NULL, NULL),
(2, 'hod.it@umpsah.edu.my', '$2y$10$gKlQ8ZRJNaVSWrBzF5LK/.wGMnwQN0d6BlQafyq.LFumkPwSs29WK', 'Ahmad Farhan', '0177777777', 'Head of IT', 1, 'UMPSAH Technology', 'hod', 1, '2026-03-27 16:26:29', NULL, NULL, NULL),
(3, 'staff@umpsah.edu.my', '$2y$10$gKlQ8ZRJNaVSWrBzF5LK/.wGMnwQN0d6BlQafyq.LFumkPwSs29WK', 'Nurul Ain', '0188888888', 'Software Developer', 1, 'UMPSAH Technology', 'user', 1, '2026-03-27 16:26:29', NULL, 'afif@umpsaholdings.my', 'E1 - E5'),
(5, 'testuser@umpsah.edu.my', '$2y$10$m9ZH8vF5dwU4.pHwu5.hxus32v.CwOynf.Livwp6oAtDNZXbwPBTq', 'Zainab Ahmad', '0123456789', 'Business Analyst', 14, 'UMPSAH Holdings Group', 'user', 1, '2026-03-27 17:04:45', NULL, NULL, NULL),
(7, 'afif@umpsaholdings.my', '$2y$10$MMDpdyQUJ6RlzqeErOmvvO8JSQl0Z2wnXGeX1jQ4v1WKlrk0qqoR.', 'Muhammad Afif Mohd Ali', '0133538207', 'Head of Subsidiary', 24, 'UMPSAH Technology', 'hod', 1, '2026-03-28 01:36:39', '103106706829148766999', 'gamma1@umpsaholdings.my', NULL),
(8, 'gamma1@umpsaholdings.my', '$2y$10$VTutvFitmVdzA1vaxTVYCuDE5Vg6Au2XiIa6dPj0nFqN0Th92w5HG', 'Gamma HOD', '01231341132', 'Head of Subs', 24, 'UMPSAH Technology', 'user', 1, '2026-03-28 02:28:07', '108944626577203024339', 'anuar@umpsaholdings.my', NULL),
(10, 'anuar@umpsaholdings.my', '$2y$10$VuNEl.xagD6L3CYCxFqEtulQ5VyBvIfJRJHaIlm2iCX7tFgA.szh.', 'Amirul Anuar bin Mohd Yatim', '0176356326', 'Senior Executive, IT', 24, 'UMPSAH Technology', 'user', 1, '2026-04-15 04:04:23', '104633174764083047029', 'anuar@umpsaholdings.my', NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `departments`
--
ALTER TABLE `departments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_dept_name` (`name`);

--
-- Indexes for table `email_approval_tokens`
--
ALTER TABLE `email_approval_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token` (`token`),
  ADD KEY `idx_token` (`token`),
  ADD KEY `idx_app` (`application_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_unread` (`user_id`,`is_read`);

--
-- Indexes for table `travel_applications`
--
ALTER TABLE `travel_applications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_dept` (`department_id`),
  ADD KEY `idx_role` (`role`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `departments`
--
ALTER TABLE `departments`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=60;

--
-- AUTO_INCREMENT for table `email_approval_tokens`
--
ALTER TABLE `email_approval_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `travel_applications`
--
ALTER TABLE `travel_applications`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
