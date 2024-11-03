/**
 * HUMAN TASKS:
 * 1. Ensure Material UI icons package is installed: npm install @mui/icons-material
 * 2. Add social media profile URLs to environment variables:
 *    - NEXT_PUBLIC_FACEBOOK_URL
 *    - NEXT_PUBLIC_TWITTER_URL
 *    - NEXT_PUBLIC_INSTAGRAM_URL
 */

import React from 'react';
import { Box, Typography, Container, Link, IconButton, useTheme, useMediaQuery } from '@mui/material';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import InstagramIcon from '@mui/icons-material/Instagram';
import { theme, palette, typography, spacing, breakpoints } from '../../config/theme';
import { APP_ROUTES } from '../../config/constants';

/**
 * Footer component for the PantryChef web dashboard
 * Implements requirements:
 * - Web Dashboard Layout: Responsive design with consistent styling
 * - Frontend UI Framework: Material Design implementation
 */
const Footer: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: palette.primary[800],
        color: palette.background.paper,
        padding: `${spacing[4]} 0`,
        marginTop: 'auto',
        width: '100%'
      }}
    >
      <Container
        sx={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing[2],
          maxWidth: breakpoints.lg,
          margin: '0 auto',
          padding: `0 ${spacing[2]}`
        }}
      >
        {/* Copyright Information */}
        <Typography
          variant="body2"
          sx={{
            fontFamily: typography.fontFamily.sans,
            textAlign: isMobile ? 'center' : 'left'
          }}
        >
          © {new Date().getFullYear()} PantryChef. All rights reserved.
        </Typography>

        {/* Navigation Links */}
        <Box
          sx={{
            display: 'flex',
            gap: spacing[3],
            justifyContent: 'center',
            flexWrap: 'wrap',
            margin: `${spacing[2]} 0`
          }}
        >
          <Link
            href={APP_ROUTES.HOME}
            color="inherit"
            underline="hover"
            sx={{ fontFamily: typography.fontFamily.sans }}
          >
            Home
          </Link>
          <Link
            href={APP_ROUTES.DASHBOARD}
            color="inherit"
            underline="hover"
            sx={{ fontFamily: typography.fontFamily.sans }}
          >
            Dashboard
          </Link>
          <Link
            href={APP_ROUTES.RECIPES}
            color="inherit"
            underline="hover"
            sx={{ fontFamily: typography.fontFamily.sans }}
          >
            Recipes
          </Link>
          <Link
            href={APP_ROUTES.PANTRY}
            color="inherit"
            underline="hover"
            sx={{ fontFamily: typography.fontFamily.sans }}
          >
            Pantry
          </Link>
          <Link
            href={APP_ROUTES.SHOPPING}
            color="inherit"
            underline="hover"
            sx={{ fontFamily: typography.fontFamily.sans }}
          >
            Shopping List
          </Link>
        </Box>

        {/* Social Media Icons */}
        <Box
          sx={{
            display: 'flex',
            gap: spacing[2],
            marginTop: isMobile ? spacing[2] : 0
          }}
        >
          <IconButton
            href={process.env.NEXT_PUBLIC_FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow us on Facebook"
            sx={{ color: palette.background.paper }}
          >
            <FacebookIcon />
          </IconButton>
          <IconButton
            href={process.env.NEXT_PUBLIC_TWITTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow us on Twitter"
            sx={{ color: palette.background.paper }}
          >
            <TwitterIcon />
          </IconButton>
          <IconButton
            href={process.env.NEXT_PUBLIC_INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow us on Instagram"
            sx={{ color: palette.background.paper }}
          >
            <InstagramIcon />
          </IconButton>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;