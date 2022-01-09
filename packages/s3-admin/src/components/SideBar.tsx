import {
  Box,
  CloseButton,
  Drawer,
  DrawerContent,
  Flex,
  HStack,
  IconButton,
  Text,
  useColorMode,
  useDisclosure,
} from "@chakra-ui/react";
import { FiMenu } from "react-icons/fi";
import { BsBucketFill } from "react-icons/bs";
import Link from "next/link";
import { FC } from "react";
import ThemeToggler from "./ThemeToggler";
import { MoonIcon, SunIcon } from "@chakra-ui/icons";
import { FaUser } from "react-icons/fa";
import { useFetchQuery } from "../lib/data-fetch";
import { User } from "../lib/data";
import FileUploadDisplay from "./FileUploadDisplay";

export interface Links {
  icon?: any;
  name: string;
  url: string;
}

const DEFAULT_LINKS: Links[] = [
  {
    name: "buckets",
    url: "/buckets",
    icon: <BsBucketFill />,
  },
];

const SideBar: FC<{ links?: Links[] }> = ({
  links = DEFAULT_LINKS,
  children,
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <Box minH="100vh">
      <Content
        display={{ base: "none", md: "block" }}
        links={links}
        onClose={onClose}
      />
      <Drawer
        autoFocus={false}
        isOpen={isOpen}
        placement="left"
        onClose={onClose}
        returnFocusOnClose={false}
        onOverlayClick={onClose}
        size="full"
      >
        <DrawerContent>
          <Content onClose={onClose} links={links} />
        </DrawerContent>
      </Drawer>
      <Mobile onOpen={onOpen} links={links} />
      <Box ml={{ base: 0, md: 60 }}>{children}</Box>
    </Box>
  );
};

const Content: FC<{ onClose: () => void; links: Links[]; display?: any }> = ({
  onClose,
  links,
  display = {},
}) => {
  return (
    <Box
      transition="3s ease"
      borderRight="1px"
      w={{ base: "full", md: 60 }}
      pos="fixed"
      h="full"
      display={display}
    >
      <Flex h="20" alignItems="center" mx="8" justifyContent="space-between">
        <Text fontSize="2xl" fontFamily="monospace" fontWeight="bold">
          Discord-s3
        </Text>
        <CloseButton display={{ base: "flex", md: "none" }} onClick={onClose} />
      </Flex>
      {links.map((link) => (
        <NavItem key={link.url} {...link}>
          <Text fontFamily="monospace" fontSize="lg">
            {link.name}
          </Text>
        </NavItem>
      ))}
    </Box>
  );
};
const NavItem: FC<Links> = ({ children, url, name, icon }) => {
  return (
    <Link href={url}>
      <Flex
        align="center"
        p="4"
        mx="4"
        borderRadius="lg"
        role="group"
        cursor="pointer"
        _hover={{
          bg: "teal.400",
          color: "white",
        }}
      >
        {icon && <Box mr="2">{icon}</Box>}
        {children}
      </Flex>
    </Link>
  );
};

const Mobile: FC<{ links: Links[]; onOpen: () => void }> = ({
  links,
  onOpen,
}) => {
  const { colorMode, toggleColorMode } = useColorMode();

  const { data } = useFetchQuery<User>("users/me");

  return (
    <Flex
      ml={{ base: 0, md: 60 }}
      px={{ base: 4, md: 4 }}
      height="20"
      alignItems="center"
      borderBottomWidth="1px"
      justifyContent={{ base: "space-between", md: "flex-end" }}
    >
      <IconButton
        display={{ base: "flex", md: "none" }}
        onClick={onOpen}
        variant="outline"
        aria-label="open menu"
        icon={<FiMenu />}
      />
      <Box marginRight="auto">
        <FileUploadDisplay />
      </Box>
      <Text
        display={{ base: "flex", md: "none" }}
        fontSize="2xl"
        fontFamily="monospace"
        fontWeight="bold"
      ></Text>

      <HStack spacing={{ base: "0", md: "6" }}>
        {data && (
          <HStack>
            <FaUser />
            <Text fontFamily="monospace">{data.name}</Text>
          </HStack>
        )}
        <IconButton
          icon={colorMode === "light" ? <SunIcon /> : <MoonIcon />}
          onClick={toggleColorMode}
          variant="ghost"
          aria-label={"dark-mode"}
        />
      </HStack>
    </Flex>
  );
};

export default SideBar;
