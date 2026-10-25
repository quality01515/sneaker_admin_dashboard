import { alpha, Box, styled } from '@mui/material';

export const SidebarWrapper = styled(Box)(
  ({ theme }) => `
    width: ${theme.sidebar.width};
    min-width: ${theme.sidebar.width};
    color: ${theme.sidebar.textColor};
    position: relative;
    z-index: 7;
    height: 100%;
`
);

export const MenuWrapper = styled(Box)(
  ({ theme }) => `
  .MuiList-root {
    padding: ${theme.spacing(0.4, 1.25)};
  }

  .MuiListSubheader-root {
    text-transform: uppercase;
    font-weight: 700;
    font-size: ${theme.typography.pxToRem(10)};
    color: ${theme.sidebar.menuItemHeadingColor};
    padding: ${theme.spacing(1.5, 1.75, 0.6)};
    line-height: 1;
    letter-spacing: 0.08em;
  }
`
);

export const SubMenuWrapper = styled(Box)(
  ({ theme }) => `
  .MuiList-root {

    .MuiListItem-root {
      padding: 2px 0;

      .MuiButton-root {
        display: flex;
        color: ${theme.sidebar.menuItemColor};
        background-color: transparent;
        width: 100%;
        justify-content: flex-start;
        padding: ${theme.spacing(0.75, 1.25)};
        border-radius: 6px;
        font-size: 12.5px;
        font-weight: 500;
        letter-spacing: 0.01em;
        position: relative;
        transition: background-color 0.15s ease, color 0.15s ease;

        /* left accent bar shown only on active */
        &::before {
          content: '';
          position: absolute;
          left: -${theme.spacing(1.5)};
          top: 50%;
          transform: translateY(-50%);
          width: 2px;
          height: 0;
          border-radius: 0 2px 2px 0;
          background-color: ${theme.palette.primary.main};
          transition: height 0.15s ease;
        }

        .MuiButton-startIcon {
          color: ${theme.sidebar.menuItemIconColor};
          font-size: ${theme.typography.pxToRem(15)};
          margin-right: ${theme.spacing(1.1)};
          flex-shrink: 0;
          transition: color 0.15s ease;

          .MuiSvgIcon-root {
            font-size: inherit;
          }
        }

        .MuiButton-endIcon {
          color: ${alpha(theme.palette.common.white, 0.25)};
          margin-left: auto;
          font-size: ${theme.typography.pxToRem(16)};
          transition: color 0.15s ease;
        }

        &:hover {
          background-color: ${alpha(theme.palette.common.white, 0.04)};
          color: ${alpha(theme.palette.common.white, 0.82)};

          .MuiButton-startIcon {
            color: ${alpha(theme.palette.common.white, 0.65)};
          }
        }

        &.active {
          background-color: ${theme.sidebar.menuItemBgActive};
          color: ${theme.sidebar.menuItemColorActive};
          font-weight: 600;

          &::before {
            height: 60%;
          }

          .MuiButton-startIcon {
            color: ${theme.sidebar.menuItemIconColorActive};
          }

          .MuiButton-endIcon {
            color: ${alpha(theme.palette.common.white, 0.45)};
          }
        }
      }
    }
  }
`
);
